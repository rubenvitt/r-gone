'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Key,
  FileUp,
  Shield,
  Package,
  ChevronRight
} from 'lucide-react'
import { PasswordEntry, PasswordVault } from '@/types/data'
import { passwordImportService } from '@/services/password-import-service'

interface PasswordImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (entries: PasswordEntry[]) => void
  currentVault: PasswordVault
}

type ImportSource = 'lastpass' | 'bitwarden' | 'onepassword' | 'chrome' | 'firefox' | 'generic-csv'
type ImportStep = 'select-source' | 'upload-file' | 'preview' | 'importing' | 'complete'

interface ImportPreview {
  totalEntries: number
  validEntries: number
  duplicates: number
  errors: string[]
  entries: PasswordEntry[]
}

export default function PasswordImportDialog({ 
  isOpen, 
  onClose, 
  onImportComplete,
  currentVault 
}: PasswordImportDialogProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('select-source')
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [importResults, setImportResults] = useState<{
    imported: number
    skipped: number
    failed: number
  } | null>(null)

  const importSources = [
    {
      id: 'lastpass' as ImportSource,
      name: 'LastPass',
      description: 'Export as CSV from LastPass vault',
      icon: Key,
      instructions: 'Go to LastPass vault → Advanced Options → Export → CSV'
    },
    {
      id: 'bitwarden' as ImportSource,
      name: 'Bitwarden',
      description: 'Export as CSV or JSON from Bitwarden',
      icon: Shield,
      instructions: 'Go to Bitwarden vault → Tools → Export vault'
    },
    {
      id: 'onepassword' as ImportSource,
      name: '1Password',
      description: 'Export from 1Password 7 or 8',
      icon: Key,
      instructions: 'Go to 1Password → File → Export → CSV'
    },
    {
      id: 'chrome' as ImportSource,
      name: 'Chrome Browser',
      description: 'Export saved passwords from Chrome',
      icon: Package,
      instructions: 'Go to Chrome Settings → Passwords → Download passwords'
    },
    {
      id: 'firefox' as ImportSource,
      name: 'Firefox Browser',
      description: 'Export saved passwords from Firefox',
      icon: Package,
      instructions: 'Use Firefox Password Manager export feature'
    },
    {
      id: 'generic-csv' as ImportSource,
      name: 'Generic CSV',
      description: 'Standard CSV format with headers',
      icon: FileText,
      instructions: 'CSV should have columns: name, username, password, url, notes'
    }
  ]

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
    }
  }, [])

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile || !selectedSource) return

    setError(null)
    setCurrentStep('preview')

    try {
      const text = await selectedFile.text()
      const preview = await passwordImportService.parseFile(
        text,
        selectedSource,
        selectedFile.name,
        currentVault
      )
      
      setImportPreview(preview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
      setCurrentStep('upload-file')
    }
  }, [selectedFile, selectedSource, currentVault])

  const handleImport = useCallback(async () => {
    if (!importPreview) return

    setCurrentStep('importing')
    setImportProgress(0)
    
    const results = {
      imported: 0,
      skipped: 0,
      failed: 0
    }

    const entriesToImport = importPreview.entries.filter(entry => {
      // Check for duplicates
      const isDuplicate = currentVault.entries.some(
        existing => 
          existing.serviceName === entry.serviceName &&
          existing.username === entry.username
      )
      
      if (isDuplicate) {
        results.skipped++
        return false
      }
      
      return true
    })

    // Simulate import progress
    for (let i = 0; i < entriesToImport.length; i++) {
      try {
        // In real implementation, this would call the service to add each entry
        await new Promise(resolve => setTimeout(resolve, 50)) // Simulate processing
        results.imported++
        setImportProgress(((i + 1) / entriesToImport.length) * 100)
      } catch {
        results.failed++
      }
    }

    setImportResults(results)
    setCurrentStep('complete')
    
    // Pass the imported entries to parent
    onImportComplete(entriesToImport)
  }, [importPreview, currentVault, onImportComplete])

  const resetDialog = useCallback(() => {
    setCurrentStep('select-source')
    setSelectedSource(null)
    setSelectedFile(null)
    setImportPreview(null)
    setImportProgress(0)
    setError(null)
    setImportResults(null)
  }, [])

  const handleClose = useCallback(() => {
    resetDialog()
    onClose()
  }, [onClose, resetDialog])

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-source':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose your password manager to import from. We support common export formats.
            </p>
            <RadioGroup value={selectedSource || ''} onValueChange={(value) => setSelectedSource(value as ImportSource)}>
              <div className="grid gap-3">
                {importSources.map((source) => {
                  const Icon = source.icon
                  return (
                    <Card 
                      key={source.id}
                      className={`cursor-pointer transition-all ${
                        selectedSource === source.id ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedSource(source.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={source.id} id={source.id} />
                          <Icon className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <CardTitle className="text-sm font-medium">{source.name}</CardTitle>
                            <CardDescription className="text-xs">{source.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            </RadioGroup>
          </div>
        )

      case 'upload-file':
        const selectedSourceInfo = importSources.find(s => s.id === selectedSource)
        return (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Export Instructions</AlertTitle>
              <AlertDescription>{selectedSourceInfo?.instructions}</AlertDescription>
            </Alert>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop your export file here, or click to browse
              </p>
              <input
                type="file"
                accept=".csv,.json,.txt"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer">
                  Choose File
                </Button>
              </Label>
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Security Note</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Your file will be processed locally in your browser. No data is sent to any server.
                The file will be encrypted immediately after import.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{importPreview?.totalEntries || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Valid Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{importPreview?.validEntries || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Duplicates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-yellow-600">{importPreview?.duplicates || 0}</p>
                </CardContent>
              </Card>
            </div>

            {importPreview?.errors && importPreview.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {importPreview.errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
              <h4 className="font-medium mb-2">Preview (first 10 entries)</h4>
              <div className="space-y-2">
                {importPreview?.entries.slice(0, 10).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{entry.serviceName}</span>
                    <span className="text-gray-500">{entry.username}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'importing':
        return (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium">Importing passwords...</h3>
              <p className="text-sm text-gray-600 mt-2">
                This may take a few moments. Please don&apos;t close this window.
              </p>
            </div>
            <Progress value={importProgress} className="w-full" />
            <p className="text-center text-sm text-gray-600">
              {Math.round(importProgress)}% complete
            </p>
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-6 py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Import Complete!</h3>
              <p className="text-sm text-gray-600 mt-2">
                Your passwords have been successfully imported.
              </p>
            </div>
            {importResults && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-green-600">{importResults.imported}</p>
                    <p className="text-sm text-gray-600">Imported</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-yellow-600">{importResults.skipped}</p>
                    <p className="text-sm text-gray-600">Skipped</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'select-source': return 'Select Import Source'
      case 'upload-file': return 'Upload Export File'
      case 'preview': return 'Review Import'
      case 'importing': return 'Importing Passwords'
      case 'complete': return 'Import Complete'
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'select-source': return selectedSource !== null
      case 'upload-file': return selectedFile !== null
      case 'preview': return importPreview !== null && importPreview.validEntries > 0
      default: return false
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>
            Import passwords from your existing password manager
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderStepContent()}
        </div>

        <DialogFooter>
          {currentStep !== 'complete' && currentStep !== 'importing' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          
          {currentStep === 'select-source' && (
            <Button 
              onClick={() => setCurrentStep('upload-file')}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          
          {currentStep === 'upload-file' && (
            <Button 
              onClick={handleFileUpload}
              disabled={!canProceed()}
            >
              Preview Import
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          
          {currentStep === 'preview' && (
            <Button 
              onClick={handleImport}
              disabled={!canProceed()}
            >
              Import {importPreview?.validEntries || 0} Passwords
            </Button>
          )}
          
          {currentStep === 'complete' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}