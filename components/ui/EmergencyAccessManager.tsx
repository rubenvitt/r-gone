'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  Key, 
  Users, 
  Link2,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  QrCode,
  FileText,
  Share2,
  Mail,
  Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import EmergencyContacts from '@/components/ui/EmergencyContacts'
import TokenManager from '@/components/ui/TokenManager'
import { useEmergencyAccess } from '@/hooks/useEmergencyAccess'
import { useFileService } from '@/hooks/useFileService'
import { EmergencyContact, EmergencyAccessToken } from '@/services/emergency-access-service'

interface EmergencyAccessManagerProps {
  className?: string
}

export default function EmergencyAccessManager({ className = '' }: EmergencyAccessManagerProps) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'tokens' | 'logs'>('contacts')
  const [showTokenGenerator, setShowTokenGenerator] = useState(false)
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null)
  const [generatedToken, setGeneratedToken] = useState<{
    token: string;
    url: string;
    tokenData: EmergencyAccessToken;
  } | null>(null)
  const [accessLogs, setAccessLogs] = useState<unknown[]>([])
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareTokenData, setShareTokenData] = useState<unknown>(null)
  const [shareForm, setShareForm] = useState({
    methods: [] as string[],
    urgencyLevel: 'normal' as 'normal' | 'urgent' | 'critical',
    includeInstructions: true,
    customMessage: ''
  })
  const [logFilter, setLogFilter] = useState('')

  // Token generation form state
  const [tokenForm, setTokenForm] = useState({
    accessLevel: 'view' as 'view' | 'download' | 'full',
    tokenType: 'temporary' as 'temporary' | 'long-term' | 'permanent',
    expirationHours: 72,
    maxUses: 10,
    refreshable: true,
    selectedFiles: [] as string[]
  })

  const {
    isLoading,
    error,
    generateToken,
    refreshToken,
    activateToken,
    getAccessLogs,
    clearError
  } = useEmergencyAccess()

  const { state: fileState, listFiles } = useFileService()

  useEffect(() => {
    loadAccessLogs()
    if (activeTab === 'tokens') {
      listFiles()
    }
  }, [activeTab])

  const loadAccessLogs = async () => {
    const logs = await getAccessLogs({ limit: 50 })
    setAccessLogs(logs)
  }

  const handleGenerateToken = async (contactId: string) => {
    const contact = await fetch(`/api/emergency/contacts/${contactId}`).then(r => r.json())
    if (contact.success) {
      setSelectedContact(contact.contact)
      setShowTokenGenerator(true)
      setActiveTab('tokens') // Switch to tokens tab to show the generator
    }
  }

  const handleCreateToken = async () => {
    if (!selectedContact) return

    const result = await generateToken({
      contactId: selectedContact.id,
      accessLevel: tokenForm.accessLevel,
      tokenType: tokenForm.tokenType,
      expirationHours: tokenForm.expirationHours,
      maxUses: tokenForm.maxUses,
      refreshable: tokenForm.refreshable,
      fileIds: tokenForm.selectedFiles.length > 0 ? tokenForm.selectedFiles : undefined
    })

    if (result) {
      setGeneratedToken(result)
      setShowTokenGenerator(false)
      await loadAccessLogs()
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatDuration = (hours: number): string => {
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    } else {
      const days = Math.floor(hours / 24)
      return `${days} day${days !== 1 ? 's' : ''}`
    }
  }

  const getActionDisplayName = (action: string): string => {
    const actionNames = {
      'created': 'Token Created',
      'shared': 'Token Shared',
      'accessed': 'Token Accessed',
      'revoked': 'Token Revoked',
      'expired': 'Token Expired',
      'failed': 'Access Failed'
    }
    return actionNames[action as keyof typeof actionNames] || action.charAt(0).toUpperCase() + action.slice(1)
  }

  const filteredLogs = logFilter 
    ? accessLogs.filter(log => {
        if (logFilter === 'failed') return !log.success
        return log.action === logFilter
      })
    : accessLogs

  const handleShareToken = (tokenData: unknown, contact: EmergencyContact) => {
    setShareTokenData({ ...tokenData as object, contact })
    setShowShareDialog(true)
  }

  const handleShareSubmit = async () => {
    if (!shareTokenData || shareForm.methods.length === 0) {
      alert('Please select at least one sharing method')
      return
    }

    // Show confirmation dialog
    const methodsText = shareForm.methods.join(', ')
    const confirmMessage = `Are you sure you want to share this emergency access token with ${shareTokenData.contact.name} via ${methodsText}?\n\nThis will grant them ${shareTokenData.tokenData.accessLevel} access until ${formatDate(shareTokenData.tokenData.expiresAt)}.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const shareRequest = {
        tokenId: shareTokenData.tokenData.id,
        contactId: shareTokenData.contact.id,
        methods: shareForm.methods.map(method => ({
          type: method,
          recipient: method === 'email' ? shareTokenData.contact.email : 
                    method === 'sms' ? shareTokenData.contact.phone : undefined,
          customMessage: shareForm.customMessage || undefined
        })),
        urgencyLevel: shareForm.urgencyLevel,
        includeInstructions: shareForm.includeInstructions
      }

      const response = await fetch('/api/emergency/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareRequest)
      })

      const result = await response.json()

      if (result.success) {
        // Show detailed success message with sharing record info
        const successRecords = result.sharingRecords?.filter(r => r.status === 'sent') || []
        const failedRecords = result.sharingRecords?.filter(r => r.status === 'failed') || []
        
        let message = `✅ Token shared successfully!\n\n`
        
        if (successRecords.length > 0) {
          message += `Successful deliveries:\n${successRecords.map(r => `• ${r.method} to ${r.recipient}`).join('\n')}\n\n`
        }
        
        if (failedRecords.length > 0) {
          message += `⚠️ Failed deliveries:\n${failedRecords.map(r => `• ${r.method}: ${r.error}`).join('\n')}\n\n`
        }
        
        message += `All sharing activity has been logged for audit purposes.`
        
        alert(message)
        
        setShowShareDialog(false)
        setShareForm({
          methods: [],
          urgencyLevel: 'normal',
          includeInstructions: true,
          customMessage: ''
        })
        
        // Refresh access logs to show the sharing events
        await loadAccessLogs()
      } else {
        alert(`❌ Sharing failed: ${result.errors?.join(', ') || 'Unknown error'}`)
      }
    } catch (error) {
      alert('❌ Failed to share token - network or server error')
      console.error('Share error:', error)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Emergency Access</h2>
              <p className="text-gray-600">Manage emergency access for trusted contacts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Generated Token Display */}
      {generatedToken && (
        <div className="mx-6 mt-4 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-900">Emergency Access URL Generated</h3>
            <button
              onClick={() => setGeneratedToken(null)}
              className="text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-800 mb-2">
                Emergency Access URL
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={generatedToken.url}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-lg bg-white text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedToken.url)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(generatedToken.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-800">Access Level:</span>
                <div className="capitalize">{generatedToken.tokenData.accessLevel}</div>
              </div>
              <div>
                <span className="font-medium text-green-800">Expires:</span>
                <div>{formatDate(generatedToken.tokenData.expiresAt)}</div>
              </div>
              <div>
                <span className="font-medium text-green-800">Max Uses:</span>
                <div>{generatedToken.tokenData.maxUses}</div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Important:</h4>
              <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                <li>Share this URL securely with the emergency contact</li>
                <li>The URL will expire automatically after the set time</li>
                <li>Access attempts are logged for security</li>
                <li>You can revoke access at any time</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => handleShareToken(generatedToken, selectedContact!)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Token
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-6 pt-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'contacts', label: 'Emergency Contacts', icon: Users },
            { id: 'tokens', label: 'Access Tokens', icon: Key },
            { id: 'logs', label: 'Access Logs', icon: FileText }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'contacts' && (
          <EmergencyContacts onGenerateToken={handleGenerateToken} />
        )}

        {activeTab === 'tokens' && (
          <div className="space-y-6">
            {/* Token Generator Modal */}
            {showTokenGenerator && selectedContact && (
              <div className="border rounded-lg p-6 bg-gray-50">
                <h4 className="font-semibold mb-4">
                  Generate Access Token for {selectedContact.name}
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Type
                    </label>
                    <select
                      value={tokenForm.tokenType}
                      onChange={(e) => {
                        const tokenType = e.target.value as 'temporary' | 'long-term' | 'permanent';
                        let defaultHours = 72;
                        let defaultMaxUses = 10;
                        
                        if (tokenType === 'long-term') {
                          defaultHours = 365 * 24; // 1 year
                          defaultMaxUses = 1000;
                        } else if (tokenType === 'permanent') {
                          defaultHours = 100 * 365 * 24; // 100 years
                          defaultMaxUses = 999999;
                        }
                        
                        setTokenForm({ 
                          ...tokenForm, 
                          tokenType,
                          expirationHours: defaultHours,
                          maxUses: defaultMaxUses
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="temporary">Temporary (Hours/Days)</option>
                      <option value="long-term">Long-term (Months/Years)</option>
                      <option value="permanent">Permanent (Lifetime)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Level
                    </label>
                    <select
                      value={tokenForm.accessLevel}
                      onChange={(e) => setTokenForm({ 
                        ...tokenForm, 
                        accessLevel: e.target.value as 'view' | 'download' | 'full' 
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="view">View Only</option>
                      <option value="download">View & Download</option>
                      <option value="full">Full Access</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiration
                    </label>
                    <select
                      value={tokenForm.expirationHours}
                      onChange={(e) => setTokenForm({ 
                        ...tokenForm, 
                        expirationHours: parseInt(e.target.value) 
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={tokenForm.tokenType === 'permanent'}
                    >
                      {tokenForm.tokenType === 'temporary' && (
                        <>
                          <option value={24}>24 hours</option>
                          <option value={72}>3 days</option>
                          <option value={168}>1 week</option>
                          <option value={720}>30 days</option>
                        </>
                      )}
                      {tokenForm.tokenType === 'long-term' && (
                        <>
                          <option value={720}>1 month</option>
                          <option value={2160}>3 months</option>
                          <option value={4320}>6 months</option>
                          <option value={8760}>1 year</option>
                          <option value={17520}>2 years</option>
                          <option value={43800}>5 years</option>
                        </>
                      )}
                      {tokenForm.tokenType === 'permanent' && (
                        <option value={100 * 365 * 24}>Permanent (100 years)</option>
                      )}
                    </select>
                    {tokenForm.tokenType === 'permanent' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Permanent tokens are valid for the lifetime of the account
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Uses
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={tokenForm.tokenType === 'permanent' ? 999999 : 1000}
                      value={tokenForm.maxUses}
                      onChange={(e) => setTokenForm({ 
                        ...tokenForm, 
                        maxUses: parseInt(e.target.value) 
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={tokenForm.refreshable}
                        onChange={(e) => setTokenForm({ 
                          ...tokenForm, 
                          refreshable: e.target.checked 
                        })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Allow token refresh/extension
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Allows extending the token's expiration time if needed
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specific Files (Optional)
                    </label>
                    <select
                      multiple
                      value={tokenForm.selectedFiles}
                      onChange={(e) => setTokenForm({ 
                        ...tokenForm, 
                        selectedFiles: Array.from(e.target.selectedOptions, option => option.value)
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {fileState.files.map(file => (
                        <option key={file.id} value={file.id}>
                          {file.filename}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to allow access to all files
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTokenGenerator(false)
                      setSelectedContact(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateToken}
                    disabled={isLoading}
                  >
                    Generate Token
                  </Button>
                </div>
              </div>
            )}

            <TokenManager />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Access Activity Log</h3>
              <div className="flex items-center space-x-2">
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  <option value="created">Token Created</option>
                  <option value="shared">Token Shared</option>
                  <option value="accessed">Token Accessed</option>
                  <option value="revoked">Token Revoked</option>
                  <option value="failed">Failed Attempts</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAccessLogs}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* Log Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Total Events</div>
                <div className="text-xl font-bold text-blue-900">{accessLogs.length}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Successful</div>
                <div className="text-xl font-bold text-green-900">
                  {accessLogs.filter(log => log.success).length}
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Failed</div>
                <div className="text-xl font-bold text-red-900">
                  {accessLogs.filter(log => !log.success).length}
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-orange-600 font-medium">Shared Events</div>
                <div className="text-xl font-bold text-orange-900">
                  {accessLogs.filter(log => log.action === 'shared').length}
                </div>
              </div>
            </div>
            
            {filteredLogs.length > 0 ? (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {log.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">
                            {getActionDisplayName(log.action)} 
                            {log.action === 'shared' && log.metadata?.sharingMethod && 
                              ` via ${log.metadata.sharingMethod}`}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(log.timestamp)}
                            {log.ipAddress && ` • IP: ${log.ipAddress}`}
                            {log.metadata?.recipient && ` • To: ${log.metadata.recipient}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Token: {log.tokenId.slice(0, 8)}...
                      </div>
                    </div>
                    {log.error && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {log.error}
                      </div>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        <details className="cursor-pointer">
                          <summary className="hover:text-gray-700">Show Details</summary>
                          <div className="mt-1 bg-gray-50 p-2 rounded">
                            {Object.entries(log.metadata).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-medium">{key}:</span>
                                <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {logFilter ? `No ${logFilter} events found` : 'No access activity recorded yet'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Token Dialog */}
      {showShareDialog && shareTokenData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Share Emergency Access</h3>
              <button
                onClick={() => setShowShareDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Sharing access token for <strong>{shareTokenData.contact.name}</strong>
                </p>
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  Token expires: {formatDate(shareTokenData.tokenData.expiresAt)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sharing Methods
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'email', label: 'Email', icon: Mail, desc: 'Send via email' },
                    { id: 'sms', label: 'SMS', icon: Smartphone, desc: 'Send via text message' },
                    { id: 'qr', label: 'QR Code', icon: QrCode, desc: 'Generate QR code' },
                    { id: 'print', label: 'Print', icon: FileText, desc: 'Generate print version' },
                    { id: 'link', label: 'Direct Link', icon: Link2, desc: 'Copy shareable link' }
                  ].map(({ id, label, icon: Icon, desc }) => (
                    <label key={id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={shareForm.methods.includes(id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setShareForm({
                              ...shareForm,
                              methods: [...shareForm.methods, id]
                            })
                          } else {
                            setShareForm({
                              ...shareForm,
                              methods: shareForm.methods.filter(m => m !== id)
                            })
                          }
                        }}
                        className="rounded"
                      />
                      <Icon className="h-4 w-4 text-gray-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{label}</div>
                        <div className="text-xs text-gray-500">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level
                </label>
                <select
                  value={shareForm.urgencyLevel}
                  onChange={(e) => setShareForm({
                    ...shareForm,
                    urgencyLevel: e.target.value as 'normal' | 'urgent' | 'critical'
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={shareForm.includeInstructions}
                    onChange={(e) => setShareForm({
                      ...shareForm,
                      includeInstructions: e.target.checked
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Include detailed instructions</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message (Optional)
                </label>
                <textarea
                  value={shareForm.customMessage}
                  onChange={(e) => setShareForm({
                    ...shareForm,
                    customMessage: e.target.value
                  })}
                  placeholder="Add a personal message..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowShareDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleShareSubmit}
                disabled={shareForm.methods.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Share Token
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}