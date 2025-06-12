'use client'

import { useState, useCallback, useRef } from 'react'
import { 
  X, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Download,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DigitalAssetInventory, DigitalAsset } from '@/types/data'
import { digitalAssetInventoryService } from '@/services/digital-asset-inventory-service'

interface DigitalAssetImportModalProps {
  inventory: DigitalAssetInventory
  onImport: (updatedInventory: DigitalAssetInventory) => void
  onClose: () => void
}

export default function DigitalAssetImportModal({ 
  inventory, 
  onImport, 
  onClose 
}: DigitalAssetImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [importType, setImportType] = useState<'csv' | 'json'>('csv')
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResults, setImportResults] = useState<{
    imported: DigitalAsset[]
    errors: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setImportResults(null)

    // Detect file type
    if (file.name.endsWith('.json')) {
      setImportType('json')
    } else if (file.name.endsWith('.csv')) {
      setImportType('csv')
    }

    // Read file content
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setFileContent(content)
    }
    reader.readAsText(file)
  }, [])

  // Process import
  const handleImport = useCallback(() => {
    if (!fileContent) return

    setIsProcessing(true)
    setImportResults(null)

    try {
      let results: { imported: DigitalAsset[], errors: string[] }

      if (importType === 'csv') {
        results = digitalAssetInventoryService.importFromCSV(fileContent, inventory)
      } else {
        results = digitalAssetInventoryService.importFromJSON(fileContent, inventory)
      }

      setImportResults(results)

      // If there are successfully imported assets, update the inventory
      if (results.imported.length > 0) {
        const updatedInventory = {
          ...inventory,
          assets: [...inventory.assets, ...results.imported]
        }
        // Update statistics
        const finalInventory = digitalAssetInventoryService['updateStatistics'](updatedInventory)
        onImport(finalInventory)
      }
    } catch (error) {
      setImportResults({
        imported: [],
        errors: [error instanceof Error ? error.message : 'Import failed']
      })
    } finally {
      setIsProcessing(false)
    }
  }, [fileContent, importType, inventory, onImport])

  // Download sample CSV
  const downloadSampleCSV = useCallback(() => {
    const sampleCSV = `Name,Type,Category,Importance,Username,Email,URL,Value,Currency,Monthly Cost,Expiry Date,Tags,Notes
"My Gmail Account",email_account,personal,high,john.doe,john.doe@gmail.com,https://mail.google.com,0,USD,0,,"email; primary",Main email account
"Amazon Prime",subscription_service,shopping,medium,john.doe,john.doe@gmail.com,https://amazon.com,0,USD,14.99,2024-12-31,"subscription; shopping",Annual subscription
"Bitcoin Wallet",cryptocurrency,investment,critical,,,https://blockchain.com,5000,USD,0,,"crypto; bitcoin",Hardware wallet backup
"example.com",domain_name,business,high,,,https://namecheap.com,0,USD,15,2025-01-15,"domain; business",Company domain`

    const blob = new Blob([sampleCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'digital-assets-sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Download sample JSON
  const downloadSampleJSON = useCallback(() => {
    const sampleJSON = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      assetCount: 2,
      assets: [
        {
          name: "My Gmail Account",
          type: "email_account",
          category: "personal",
          importance: "high",
          username: "john.doe",
          email: "john.doe@gmail.com",
          accessUrl: "https://mail.google.com",
          tags: ["email", "primary"],
          notes: "Main email account",
          assetData: {
            type: "email_account",
            emailAddress: "john.doe@gmail.com",
            provider: "Gmail",
            accountType: "personal"
          }
        },
        {
          name: "Amazon Prime",
          type: "subscription_service",
          category: "shopping",
          importance: "medium",
          username: "john.doe",
          email: "john.doe@gmail.com",
          accessUrl: "https://amazon.com",
          tags: ["subscription", "shopping"],
          notes: "Annual subscription",
          costs: {
            type: "recurring",
            amount: 14.99,
            currency: "USD",
            frequency: "monthly"
          },
          expiryDate: "2024-12-31T00:00:00.000Z",
          assetData: {
            type: "subscription_service",
            serviceName: "Amazon Prime",
            plan: "Annual",
            billingCycle: "yearly",
            startDate: "2024-01-01T00:00:00.000Z"
          }
        }
      ]
    }

    const blob = new Blob([JSON.stringify(sampleJSON, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'digital-assets-sample.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Import Digital Assets</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* File Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import Format
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={importType === 'csv'}
                  onChange={(e) => setImportType(e.target.value as 'csv')}
                  className="mr-2"
                />
                <span>CSV File</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="json"
                  checked={importType === 'json'}
                  onChange={(e) => setImportType(e.target.value as 'json')}
                  className="mr-2"
                />
                <span>JSON File</span>
              </label>
            </div>
          </div>

          {/* Sample Download */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  Need a template?
                </p>
                <p className="text-sm text-blue-700 mb-3">
                  Download a sample file to see the expected format for importing your digital assets.
                </p>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Sample CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleJSON}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Sample JSON
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  {importType === 'csv' ? 'CSV' : 'JSON'} files only
                </p>
              </div>
            </div>
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              {/* Success Summary */}
              {importResults.imported.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">
                        Successfully imported {importResults.imported.length} asset{importResults.imported.length !== 1 ? 's' : ''}
                      </p>
                      <div className="mt-2 text-sm text-green-700">
                        <ul className="list-disc list-inside space-y-1">
                          {importResults.imported.slice(0, 5).map((asset, index) => (
                            <li key={index}>{asset.name} ({asset.type})</li>
                          ))}
                          {importResults.imported.length > 5 && (
                            <li>and {importResults.imported.length - 5} more...</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Summary */}
              {importResults.errors.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">
                        {importResults.errors.length} error{importResults.errors.length !== 1 ? 's' : ''} occurred
                      </p>
                      <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc list-inside space-y-1">
                          {importResults.errors.slice(0, 5).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {importResults.errors.length > 5 && (
                            <li>and {importResults.errors.length - 5} more errors...</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center space-x-3">
            {importResults && importResults.imported.length > 0 && (
              <Button variant="outline" onClick={onClose}>
                Done
              </Button>
            )}
            {!importResults && (
              <Button
                onClick={handleImport}
                disabled={!selectedFile || isProcessing}
              >
                {isProcessing ? 'Importing...' : 'Import Assets'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}