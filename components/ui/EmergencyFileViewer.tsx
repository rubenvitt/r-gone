'use client'

import { useState } from 'react'
import { 
  Download, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Copy, 
  FileText,
  Image,
  FileArchive,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Printer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'

interface FileMetadata {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  description?: string;
  tags?: string[];
}

interface TokenData {
  accessLevel: 'view' | 'download' | 'full';
  contact?: {
    name: string;
  };
}

interface EmergencyFileViewerProps {
  files: FileMetadata[];
  token: string;
  tokenData: TokenData;
  onFileAccess: (fileId: string, action: 'view' | 'download' | 'print') => Promise<void>;
  className?: string;
}

interface FileContent {
  content: string;
  metadata: FileMetadata;
  filename: string;
}

export default function EmergencyFileViewer({ 
  files, 
  token, 
  tokenData, 
  onFileAccess, 
  className = '' 
}: EmergencyFileViewerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [fileContents, setFileContents] = useState<Record<string, FileContent>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [zoomLevel, setZoomLevel] = useState(100)
  const [, setSelectedFileId] = useState<string | null>(null)

  // Filter files based on search term
  const filteredFiles = files.filter(file => 
    file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Get file type based on filename
  const getFileType = (filename: string): 'text' | 'markdown' | 'image' | 'pdf' | 'archive' | 'unknown' => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (!ext) return 'unknown'
    
    if (['md', 'markdown'].includes(ext)) {
      return 'markdown'
    } else if (['txt', 'json', 'csv', 'xml', 'html', 'css', 'js', 'ts', 'log', 'conf', 'yaml', 'yml'].includes(ext)) {
      return 'text'
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
      return 'image'
    } else if (ext === 'pdf') {
      return 'pdf'
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return 'archive'
    }
    return 'unknown'
  }

  // Get file type icon
  const getFileIcon = (filename: string) => {
    const type = getFileType(filename)
    switch (type) {
      case 'markdown': return <FileText className="h-5 w-5 text-purple-600" />
      case 'text': return <FileText className="h-5 w-5 text-blue-600" />
      case 'image': return <Image className="h-5 w-5 text-green-600" />
      case 'pdf': return <FileText className="h-5 w-5 text-red-600" />
      case 'archive': return <FileArchive className="h-5 w-5 text-yellow-600" />
      default: return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  // Load file content
  const loadFileContent = async (fileId: string) => {
    if (fileContents[fileId] || isLoading[fileId]) return

    setIsLoading(prev => ({ ...prev, [fileId]: true }))

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setFileContents(prev => ({
            ...prev,
            [fileId]: {
              content: result.content,
              metadata: result.metadata,
              filename: result.filename
            }
          }))
          await onFileAccess(fileId, 'view')
        } else {
          throw new Error(result.error || 'Failed to load file')
        }
      } else {
        throw new Error('Failed to fetch file')
      }
    } catch (error) {
      console.error('Failed to load file:', error)
      alert(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(prev => ({ ...prev, [fileId]: false }))
    }
  }

  // Toggle file expansion
  const toggleFileExpansion = async (fileId: string) => {
    const isExpanded = expandedFiles.has(fileId)
    
    if (isExpanded) {
      setExpandedFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileId)
        return newSet
      })
      setSelectedFileId(null)
    } else {
      setExpandedFiles(prev => new Set(prev).add(fileId))
      setSelectedFileId(fileId)
      await loadFileContent(fileId)
    }
  }

  // Copy content to clipboard
  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      alert('Content copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy content')
    }
  }

  // Print content with watermark
  const printContent = async (fileId: string) => {
    const fileContent = fileContents[fileId]
    if (!fileContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const watermark = `Emergency Access - ${tokenData.contact?.name || 'Authorized User'} - ${new Date().toLocaleString()}`
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print: ${fileContent.filename}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              position: relative;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 24px;
              color: rgba(0,0,0,0.1);
              pointer-events: none;
              z-index: 1000;
              white-space: nowrap;
            }
            .header {
              border-bottom: 2px solid #ccc;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .content {
              white-space: pre-wrap;
              font-size: 12px;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="watermark">${watermark}</div>
          <div class="header">
            <h2>${fileContent.filename}</h2>
            <p>Accessed: ${new Date().toLocaleString()}</p>
            <p>Access Level: ${tokenData.accessLevel?.toUpperCase()}</p>
          </div>
          <div class="content">${fileContent.content}</div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    
    await onFileAccess(fileId, 'print')
  }

  // Download file
  const downloadFile = async (fileId: string) => {
    const fileContent = fileContents[fileId]
    if (!fileContent) return

    try {
      // Add watermark to downloaded content
      const watermarkedContent = `${fileContent.content}\n\n--- Emergency Access Download ---\nAccessed by: ${tokenData.contact?.name || 'Authorized User'}\nDownload time: ${new Date().toISOString()}\nAccess level: ${tokenData.accessLevel}\n`
      
      const blob = new Blob([watermarkedContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileContent.filename || `file-${fileId}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      await onFileAccess(fileId, 'download')
    } catch (error) {
      console.error('Failed to download file:', error)
      alert('Failed to download file')
    }
  }

  // Search within file content
  const searchInContent = (content: string, term: string): boolean => {
    return content.toLowerCase().includes(term.toLowerCase())
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Check if user can perform action
  const canPerformAction = (action: 'view' | 'download' | 'print'): boolean => {
    switch (action) {
      case 'view':
        return ['view', 'download', 'full'].includes(tokenData.accessLevel)
      case 'download':
        return ['download', 'full'].includes(tokenData.accessLevel)
      case 'print':
        return ['view', 'download', 'full'].includes(tokenData.accessLevel)
      default:
        return false
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search files by name, description, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* File List */}
      <div className="space-y-4">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No files found matching your search.</p>
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isExpanded = expandedFiles.has(file.id)
            const isLoaded = fileContents[file.id]
            const isLoadingFile = isLoading[file.id]
            
            return (
              <div key={file.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* File Header */}
                <div className="p-4 bg-gray-50 cursor-pointer" onClick={() => toggleFileExpansion(file.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.filename)}
                      <div>
                        <h4 className="font-medium text-gray-900">{file.filename}</h4>
                        <div className="text-sm text-gray-600">
                          {formatFileSize(file.size)} • {new Date(file.updatedAt).toLocaleDateString()}
                          {getFileType(file.filename) === 'markdown' && (
                            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                              Markdown
                            </span>
                          )}
                          {file.description && ` • ${file.description}`}
                        </div>
                        {file.tags && file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {file.tags.map(tag => (
                              <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isLoadingFile && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* File Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {isLoaded ? (
                      <div className="p-4">
                        {/* Content Controls */}
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Content:</span>
                            {searchTerm && searchInContent(fileContents[file.id].content, searchTerm) && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                Contains search term
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(fileContents[file.id].content)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                            {canPerformAction('print') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => printContent(file.id)}
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                Print
                              </Button>
                            )}
                            {canPerformAction('download') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadFile(file.id)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Content Display */}
                        <div 
                          className="bg-gray-50 rounded border overflow-auto"
                          style={{ fontSize: `${zoomLevel}%` }}
                        >
                          {getFileType(file.filename) === 'markdown' ? (
                            <div className="p-4 max-h-96">
                              <MarkdownRenderer 
                                content={fileContents[file.id].content}
                                allowRaw={true}
                                enableCopy={false} // We already have copy in the controls above
                              />
                            </div>
                          ) : (
                            <div className="p-4 max-h-96">
                              <div className="whitespace-pre-wrap font-mono text-sm">
                                {fileContents[file.id].content}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center justify-center space-x-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                            disabled={zoomLevel <= 50}
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-gray-600 px-3">
                            {zoomLevel}%
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
                            disabled={zoomLevel >= 200}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : isLoadingFile ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading file content...</p>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="text-center py-4">
                          <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                          <p className="text-gray-600">Click to load file content</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* File Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-blue-800">
            <strong>{filteredFiles.length}</strong> file{filteredFiles.length !== 1 ? 's' : ''} available
            {searchTerm && ` (filtered from ${files.length})`}
          </div>
          <div className="text-sm text-blue-600">
            Access Level: <strong className="uppercase">{tokenData.accessLevel}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}