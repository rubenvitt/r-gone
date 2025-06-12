'use client'

import { useState, useEffect } from 'react'
import { 
  Key, 
  Clock, 
  Users, 
  Eye, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  RotateCcw,
  Copy,
  ExternalLink,
  RefreshCw,
  Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEmergencyAccess } from '@/hooks/useEmergencyAccess'

interface TokenData {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  accessLevel: 'view' | 'download' | 'full';
  tokenType: 'temporary' | 'long-term' | 'permanent';
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  isExpired: boolean;
  isUsedUp: boolean;
  isActive: boolean;
  revokedAt?: string;
  fileIds: string[];
  refreshable: boolean;
  activatedAt?: string;
  lastRefreshedAt?: string;
  jwtToken?: string; // The actual JWT token for URL generation
}

interface TokenManagerProps {
  className?: string;
}

export default function TokenManager({ className = '' }: TokenManagerProps) {
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showExpired, setShowExpired] = useState(false)
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null)
  const [tokenUrls, setTokenUrls] = useState<Record<string, string>>({})
  
  const { refreshToken, activateToken } = useEmergencyAccess()

  useEffect(() => {
    loadTokens()
  }, [showExpired])

  const loadTokens = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/emergency/tokens?includeExpired=${showExpired}`)
      const result = await response.json()

      if (result.success) {
        setTokens(result.tokens)
        // Generate URLs for active tokens
        const urls: Record<string, string> = {}
        for (const token of result.tokens) {
          if (token.isActive) {
            try {
              urls[token.id] = await generateTokenUrl(token)
            } catch (error) {
              console.error('Failed to generate URL for token:', token.id, error)
              // Fallback URL
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
              urls[token.id] = `${baseUrl}/emergency-access/${token.id}`
            }
          }
        }
        setTokenUrls(urls)
      } else {
        setError(result.error || 'Failed to load tokens')
      }
    } catch (error) {
      setError('Failed to load emergency access tokens')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeToken = async (tokenId: string, reason?: string) => {
    if (!confirm('Are you sure you want to revoke this access token? This cannot be undone.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/emergency/tokens/${tokenId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || 'Manually revoked' }),
      })

      const result = await response.json()

      if (result.success) {
        await loadTokens()
      } else {
        setError(result.error || 'Failed to revoke token')
      }
    } catch (error) {
      setError('Failed to revoke token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCleanupExpired = async () => {
    if (!confirm('This will permanently delete all expired tokens. Continue?')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/emergency/cleanup', {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        alert(`Cleanup completed: ${result.result.cleaned} expired tokens removed`)
        await loadTokens()
      } else {
        setError(result.error || 'Cleanup failed')
      }
    } catch (error) {
      setError('Failed to cleanup expired tokens')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshToken = async (tokenId: string) => {
    const token = tokens.find(t => t.id === tokenId)
    if (!token) return
    
    let extensionHours: number | undefined
    
    // Determine default extension based on token type
    switch (token.tokenType) {
      case 'temporary':
        extensionHours = 72 // 3 days
        break
      case 'long-term':
        extensionHours = 365 * 24 // 1 year
        break
      case 'permanent':
        extensionHours = undefined // Permanent tokens don't need extension
        break
    }
    
    const customExtension = prompt(
      `Extend token expiration by how many hours?\n\nDefault for ${token.tokenType} tokens: ${extensionHours || 'N/A'} hours`,
      extensionHours?.toString() || ''
    )
    
    if (customExtension === null) return // User cancelled
    
    const hours = customExtension ? parseInt(customExtension) : extensionHours
    if (hours && isNaN(hours)) {
      alert('Please enter a valid number of hours')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await refreshToken(tokenId, hours)
      if (result) {
        alert('Token refreshed successfully!')
        await loadTokens()
      }
    } catch (error) {
      setError('Failed to refresh token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivateToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to activate this token? This will mark it as ready for use.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const success = await activateToken(tokenId)
      if (success) {
        alert('Token activated successfully!')
        await loadTokens()
      }
    } catch (error) {
      setError('Failed to activate token')
    } finally {
      setIsLoading(false)
    }
  }

  const generateTokenUrl = async (token: TokenData): Promise<string> => {
    try {
      // Get the JWT token for this token ID
      const response = await fetch(`/api/emergency/tokens/${token.id}/jwt`)
      const result = await response.json()
      
      if (result.success && result.jwtToken) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
        return `${baseUrl}/emergency-access/${result.jwtToken}`
      } else {
        // Fallback to token ID if JWT generation fails
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
        return `${baseUrl}/emergency-access/${token.id}`
      }
    } catch (error) {
      console.error('Failed to generate JWT URL:', error)
      // Fallback to token ID
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
      return `${baseUrl}/emergency-access/${token.id}`
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

  const formatExpiresIn = (expiresAt: string): string => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()

    if (diff <= 0) {
      return 'Expired'
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) {
      return `${days}d ${hours}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const getStatusIcon = (token: TokenData) => {
    if (token.revokedAt) {
      return <XCircle className="h-5 w-5 text-red-600" />
    } else if (token.isExpired) {
      return <Clock className="h-5 w-5 text-orange-600" />
    } else if (token.isUsedUp) {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    } else if (token.isActive) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else {
      return <XCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusText = (token: TokenData) => {
    if (token.revokedAt) {
      return 'Revoked'
    } else if (token.isExpired) {
      return 'Expired'
    } else if (token.isUsedUp) {
      return 'Used Up'
    } else if (token.isActive) {
      return 'Active'
    } else {
      return 'Inactive'
    }
  }

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'view':
        return 'bg-blue-100 text-blue-800'
      case 'download':
        return 'bg-green-100 text-green-800'
      case 'full':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const activeTokens = tokens.filter(t => t.isActive)
  const inactiveTokens = tokens.filter(t => !t.isActive)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Access Token Management</h3>
          <p className="text-sm text-gray-600">
            Manage emergency access URLs and monitor their usage
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
              className="rounded"
            />
            <span>Show expired/revoked</span>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTokens}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanupExpired}
            disabled={isLoading}
            className="text-red-600 hover:text-red-800"
          >
            Cleanup Expired
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-900">{activeTokens.length}</div>
          <div className="text-sm text-green-600">Active Tokens</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{inactiveTokens.length}</div>
          <div className="text-sm text-gray-600">Inactive Tokens</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-900">
            {tokens.reduce((sum, t) => sum + t.currentUses, 0)}
          </div>
          <div className="text-sm text-blue-600">Total Uses</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-900">
            {tokens.filter(t => new Date(t.expiresAt) < new Date()).length}
          </div>
          <div className="text-sm text-purple-600">Expired</div>
        </div>
      </div>

      {/* Tokens List */}
      {isLoading && tokens.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading tokens...</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-8">
          <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No emergency access tokens created yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tokens.map((token) => (
            <div
              key={token.id}
              className={`border rounded-lg p-4 ${
                token.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(token)}
                    <div>
                      <h4 className="font-medium">{token.contactName}</h4>
                      <p className="text-sm text-gray-600">{token.contactEmail}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccessLevelColor(token.accessLevel)}`}>
                      {token.accessLevel.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {getStatusText(token)}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">Type:</span>
                      <div className="capitalize">{token.tokenType}</div>
                    </div>
                    <div>
                      <span className="font-medium">Expires:</span>
                      <div className={token.isExpired ? 'text-red-600' : ''}>
                        {formatExpiresIn(token.expiresAt)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Usage:</span>
                      <div>
                        {token.currentUses}/{token.maxUses} uses
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <div className="flex items-center space-x-1">
                        <span>{getStatusText(token)}</span>
                        {token.refreshable && <span className="text-blue-500 text-xs">(Refreshable)</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">Created:</span>
                      <div>{formatDate(token.createdAt)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Files:</span>
                      <div>
                        {token.fileIds.length > 0 ? `${token.fileIds.length} specific` : 'All files'}
                      </div>
                    </div>
                    {token.activatedAt && (
                      <div>
                        <span className="font-medium">Activated:</span>
                        <div>{formatDate(token.activatedAt)}</div>
                      </div>
                    )}
                    {token.lastRefreshedAt && (
                      <div>
                        <span className="font-medium">Last Refreshed:</span>
                        <div>{formatDate(token.lastRefreshedAt)}</div>
                      </div>
                    )}
                  </div>

                  {token.isActive && tokenUrls[token.id] && (
                    <div className="flex items-center space-x-2 bg-white rounded border p-2">
                      <input
                        type="text"
                        value={tokenUrls[token.id]}
                        readOnly
                        className="flex-1 text-sm bg-transparent border-none focus:outline-none"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(tokenUrls[token.id])}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(tokenUrls[token.id], '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedToken(token)}
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {/* Refresh button for refreshable tokens */}
                  {!token.revokedAt && token.refreshable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshToken(token.id)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Refresh/extend token"
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Activate button for permanent tokens that haven't been activated */}
                  {!token.revokedAt && token.tokenType === 'permanent' && !token.activatedAt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivateToken(token.id)}
                      className="text-green-600 hover:text-green-800"
                      title="Activate permanent token"
                      disabled={isLoading}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {!token.revokedAt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeToken(token.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Revoke token"
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {token.revokedAt && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                  Revoked: {formatDate(token.revokedAt)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Token Details Modal */}
      {selectedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Token Details</h3>
              <button
                onClick={() => setSelectedToken(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">Token ID:</label>
                  <div className="text-sm text-gray-600 font-mono">{selectedToken.id}</div>
                </div>
                <div>
                  <label className="font-medium">Contact:</label>
                  <div className="text-sm text-gray-600">{selectedToken.contactName}</div>
                </div>
                <div>
                  <label className="font-medium">Token Type:</label>
                  <div className="text-sm text-gray-600 capitalize">{selectedToken.tokenType}</div>
                </div>
                <div>
                  <label className="font-medium">Access Level:</label>
                  <div className="text-sm text-gray-600 capitalize">{selectedToken.accessLevel}</div>
                </div>
                <div>
                  <label className="font-medium">Status:</label>
                  <div className="text-sm text-gray-600 flex items-center space-x-2">
                    <span>{getStatusText(selectedToken)}</span>
                    {selectedToken.refreshable && <span className="text-blue-500 text-xs">(Refreshable)</span>}
                  </div>
                </div>
                <div>
                  <label className="font-medium">Created:</label>
                  <div className="text-sm text-gray-600">{formatDate(selectedToken.createdAt)}</div>
                </div>
                <div>
                  <label className="font-medium">Expires:</label>
                  <div className="text-sm text-gray-600">{formatDate(selectedToken.expiresAt)}</div>
                </div>
                <div>
                  <label className="font-medium">Uses:</label>
                  <div className="text-sm text-gray-600">
                    {selectedToken.currentUses} of {selectedToken.maxUses}
                  </div>
                </div>
                {selectedToken.activatedAt && (
                  <div>
                    <label className="font-medium">Activated:</label>
                    <div className="text-sm text-gray-600">{formatDate(selectedToken.activatedAt)}</div>
                  </div>
                )}
                {selectedToken.lastRefreshedAt && (
                  <div>
                    <label className="font-medium">Last Refreshed:</label>
                    <div className="text-sm text-gray-600">{formatDate(selectedToken.lastRefreshedAt)}</div>
                  </div>
                )}
                <div>
                  <label className="font-medium">File Access:</label>
                  <div className="text-sm text-gray-600">
                    {selectedToken.fileIds.length > 0 
                      ? `${selectedToken.fileIds.length} specific files`
                      : 'All files'
                    }
                  </div>
                </div>
              </div>

              {selectedToken.fileIds.length > 0 && (
                <div>
                  <label className="font-medium">Authorized Files:</label>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedToken.fileIds.map(fileId => (
                      <div key={fileId} className="font-mono">{fileId}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={() => setSelectedToken(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}