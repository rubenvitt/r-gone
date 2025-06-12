'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Lock, AlertTriangle, Clock, CheckCircle, Download, Eye, Shield } from 'lucide-react'
import EmergencyFileViewer from '@/components/ui/EmergencyFileViewer'

interface Contact {
  name: string;
  email: string;
}

interface TokenData {
  accessLevel: 'view' | 'download' | 'full';
  fileIds?: string[];
}

interface TokenValidation {
  valid: boolean;
  token?: TokenData;
  contact?: Contact;
  remainingUses?: number;
  expiresIn?: number;
  error?: string;
}

export default function EmergencyAccessPage() {
  const params = useParams()
  const token = params.token as string
  
  const [validation, setValidation] = useState<TokenValidation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableFiles, setAvailableFiles] = useState<Array<{
    id: string;
    filename: string;
    size: number;
    createdAt: string;
    updatedAt: string;
    description?: string;
    tags?: string[];
  }>>([])
  const [accessStats, setAccessStats] = useState({
    totalAccessed: 0,
    lastAccessTime: null as string | null,
    actions: [] as Array<{ fileId: string; action: string; timestamp: string }>
  })

  useEffect(() => {
    validateToken()
  }, [token])  // eslint-disable-line react-hooks/exhaustive-deps

  const validateToken = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/emergency/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (result.success) {
        setValidation(result)
        // Load available files
        await loadAvailableFiles()
      } else {
        setError(result.error || 'Invalid token')
        setValidation({ valid: false, error: result.error })
      }
    } catch {
      setError('Failed to validate access token')
      setValidation({ valid: false, error: 'Network error' })
    } finally {
      setIsLoading(false)
    }
  }

  const loadAvailableFiles = async () => {
    try {
      const response = await fetch('/api/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailableFiles(result.files || [])
        }
      }
    } catch (err) {
      console.error('Failed to load files:', err)
    }
  }

  const handleFileAccess = async (fileId: string, action: 'view' | 'download' | 'print') => {
    try {
      const response = await fetch('/api/emergency/record-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          fileId,
          action
        }),
      })

      if (response.ok) {
        const now = new Date().toISOString()
        setAccessStats(prev => ({
          totalAccessed: prev.totalAccessed + 1,
          lastAccessTime: now,
          actions: [...prev.actions, { fileId, action, timestamp: now }]
        }))
      }
    } catch (error) {
      console.error('Failed to record access:', error)
    }
  }


  const formatExpiresIn = (seconds: number): string => {
    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes`
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)} hours`
    } else {
      return `${Math.floor(seconds / 86400)} days`
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating emergency access...</p>
        </div>
      </div>
    )
  }

  if (!validation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              {error || validation?.error || 'This emergency access link is invalid or has expired.'}
            </p>
            <div className="text-sm text-gray-500">
              If you believe this is an error, please contact the person who shared this link with you.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { token: tokenData, contact, remainingUses, expiresIn } = validation

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lock className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold">Emergency Access</h1>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  Expires in {formatExpiresIn(expiresIn || 0)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  {remainingUses} uses remaining
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Welcome, {contact.name}
          </h2>
          <p className="text-blue-800">
            You have been granted emergency access to view encrypted information. 
            This access is temporary and limited to the files authorized for you.
          </p>
        </div>

        {/* Access Level Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Your Access Permissions</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg text-center ${
              tokenData.accessLevel === 'view' || tokenData.accessLevel === 'download' || tokenData.accessLevel === 'full'
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <Eye className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <div className="font-medium">View Files</div>
              <div className="text-sm text-gray-600">Read encrypted content</div>
            </div>
            <div className={`p-4 rounded-lg text-center ${
              tokenData.accessLevel === 'download' || tokenData.accessLevel === 'full'
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <Download className="h-6 w-6 mx-auto mb-2 ${
                tokenData.accessLevel === 'download' || tokenData.accessLevel === 'full'
                  ? 'text-green-600'
                  : 'text-gray-400'
              }" />
              <div className="font-medium">Download Files</div>
              <div className="text-sm text-gray-600">
                {tokenData.accessLevel === 'download' || tokenData.accessLevel === 'full'
                  ? 'Export decrypted data'
                  : 'Not permitted'
                }
              </div>
            </div>
            <div className={`p-4 rounded-lg text-center ${
              tokenData.accessLevel === 'full'
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <Lock className="h-6 w-6 mx-auto mb-2 ${
                tokenData.accessLevel === 'full'
                  ? 'text-green-600'
                  : 'text-gray-400'
              }" />
              <div className="font-medium">Full Access</div>
              <div className="text-sm text-gray-600">
                {tokenData.accessLevel === 'full'
                  ? 'All permissions'
                  : 'Not permitted'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Access Statistics */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Access Activity</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{accessStats.totalAccessed}</div>
              <div className="text-sm text-gray-600">Total Actions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{availableFiles.length}</div>
              <div className="text-sm text-gray-600">Available Files</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {tokenData.accessLevel?.toUpperCase()}
              </div>
              <div className="text-sm text-gray-600">Access Level</div>
            </div>
          </div>
          {accessStats.lastAccessTime && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Last activity: {new Date(accessStats.lastAccessTime).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced File Viewer */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Authorized Files</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Shield className="h-4 w-4" />
              <span>Secure Emergency Access</span>
            </div>
          </div>
          
          {(() => {
            const filesToShow = tokenData.fileIds && tokenData.fileIds.length > 0 
              ? availableFiles.filter(file => tokenData.fileIds.includes(file.id))
              : availableFiles;
            
            return filesToShow.length > 0 ? (
              <EmergencyFileViewer
                files={filesToShow}
                token={token}
                tokenData={tokenData}
                onFileAccess={handleFileAccess}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Lock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No files available</p>
                <p>This emergency access token does not authorize any files for viewing.</p>
              </div>
            );
          })()}
        </div>

        {/* Enhanced Notice & Instructions */}
        <div className="mt-8 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h4 className="font-semibold text-yellow-900 mb-2">Security & Privacy Notice</h4>
            <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
              <li>This access is temporary and will expire automatically</li>
              <li>All access attempts are logged for security and audit purposes</li>
              <li>Downloaded files include digital watermarks for identification</li>
              <li>Do not share this link with others - it is personalized for you</li>
              <li>Contact the owner if you need extended access or have questions</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-2">How to Use This Interface</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800 text-sm">
              <div>
                <h5 className="font-medium mb-2">Viewing Files:</h5>
                <ul className="list-disc list-inside space-y-1">
                  <li>Click on any file to expand and view its contents</li>
                  <li>Use the search bar to find specific files or content</li>
                  <li>Adjust zoom level for better readability</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-2">Available Actions:</h5>
                <ul className="list-disc list-inside space-y-1">
                  <li>Copy content to clipboard for easy access</li>
                  <li>Print with automatic watermarking (if permitted)</li>
                  <li>Download files with audit trail (if permitted)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}