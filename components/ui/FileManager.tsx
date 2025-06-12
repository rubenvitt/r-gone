'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Trash2, FileText, Calendar, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFileService } from '@/hooks/useFileService'
import { FileListItem } from '@/services/file-service'

interface FileManagerProps {
  onFileSelect?: (fileId: string) => void
  selectedFileId?: string
  className?: string
}

export default function FileManager({
  onFileSelect,
  selectedFileId,
  className = ''
}: FileManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'filename' | 'size'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showStats, setShowStats] = useState(false)

  const {
    state,
    listFiles,
    deleteFile,
    getStorageStats,
    verifyFileIntegrity,
    clearError
  } = useFileService()

  const [storageStats, setStorageStats] = useState<{
    totalFiles: number
    totalSize: number
    oldestFile?: string
    newestFile?: string
    corruptedFiles: number
  } | null>(null)

  // Load storage stats
  const loadStorageStats = useCallback(async () => {
    const stats = await getStorageStats()
    setStorageStats(stats)
  }, [getStorageStats])

  // Refresh file list
  const handleRefresh = useCallback(async () => {
    await listFiles({
      sortBy,
      sortOrder,
      search: searchTerm || undefined
    })
  }, [listFiles, sortBy, sortOrder, searchTerm])

  // Load files on mount and when sort options change
  useEffect(() => {
    handleRefresh()
  }, [handleRefresh, sortBy, sortOrder])

  // Handle search
  const handleSearch = useCallback(async () => {
    await listFiles({
      sortBy,
      sortOrder,
      search: searchTerm || undefined
    })
  }, [listFiles, sortBy, sortOrder, searchTerm])

  // Handle file deletion
  const handleDelete = useCallback(async (fileId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return
    }

    const success = await deleteFile(fileId)
    if (success) {
      await handleRefresh()
      if (selectedFileId === fileId && onFileSelect) {
        onFileSelect('')
      }
    }
  }, [deleteFile, handleRefresh, selectedFileId, onFileSelect])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with search and controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h3 className="text-lg font-semibold">Saved Files</h3>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 pr-4 py-2 border rounded-md w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort controls */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-')
              setSortBy(field as typeof sortBy)
              setSortOrder(order as typeof sortOrder)
            }}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="updatedAt-desc">Latest Modified</option>
            <option value="updatedAt-asc">Oldest Modified</option>
            <option value="createdAt-desc">Latest Created</option>
            <option value="createdAt-asc">Oldest Created</option>
            <option value="filename-asc">Name A-Z</option>
            <option value="filename-desc">Name Z-A</option>
            <option value="size-desc">Largest First</option>
            <option value="size-asc">Smallest First</option>
          </select>

          {/* Stats toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowStats(!showStats)
              if (!showStats && !storageStats) {
                loadStorageStats()
              }
            }}
          >
            <HardDrive className="h-4 w-4 mr-2" />
            Stats
          </Button>
        </div>
      </div>

      {/* Storage stats */}
      {showStats && storageStats && (
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-900">Total Files</div>
            <div className="text-gray-600">{storageStats.totalFiles}</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">Total Size</div>
            <div className="text-gray-600">{formatFileSize(storageStats.totalSize)}</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">Oldest File</div>
            <div className="text-gray-600 truncate">{storageStats.oldestFile || 'N/A'}</div>
          </div>
          <div>
            <div className="font-medium text-gray-900">Corrupted Files</div>
            <div className={`flex items-center ${storageStats.corruptedFiles > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {storageStats.corruptedFiles > 0 ? (
                <AlertTriangle className="h-4 w-4 mr-1" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              {storageStats.corruptedFiles}
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-700">{state.error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {state.isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Files list */}
      {!state.isLoading && (
        <div className="space-y-2">
          {state.files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No files found</p>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    handleRefresh()
                  }}
                  className="text-blue-600 hover:text-blue-800 mt-2"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            state.files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                isSelected={selectedFileId === file.id}
                onSelect={() => onFileSelect?.(file.id)}
                onDelete={() => handleDelete(file.id, file.filename)}
                formatFileSize={formatFileSize}
                formatDate={formatDate}
                verifyIntegrity={verifyFileIntegrity}
              />
            ))
          )}
        </div>
      )}

      {/* Refresh button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={state.isLoading}
        >
          Refresh
        </Button>
      </div>
    </div>
  )
}

// File item component
interface FileItemProps {
  file: FileListItem
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  formatFileSize: (bytes: number) => string
  formatDate: (dateString: string) => string
  verifyIntegrity: (fileId: string) => Promise<{ isValid: boolean; error?: string }>
}

function FileItem({
  file,
  isSelected,
  onSelect,
  onDelete,
  formatFileSize,
  formatDate,
  verifyIntegrity
}: FileItemProps) {
  const [integrityStatus, setIntegrityStatus] = useState<'unknown' | 'checking' | 'valid' | 'invalid'>('unknown')

  const checkIntegrity = useCallback(async () => {
    setIntegrityStatus('checking')
    const result = await verifyIntegrity(file.id)
    setIntegrityStatus(result.isValid ? 'valid' : 'invalid')
  }, [file.id, verifyIntegrity])

  return (
    <div
      className={`
        border rounded-lg p-4 cursor-pointer transition-colors
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <h4 className="font-medium text-gray-900 truncate">{file.filename}</h4>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              v{file.version}
            </span>
          </div>
          
          {file.description && (
            <p className="text-sm text-gray-600 mt-1 truncate">{file.description}</p>
          )}
          
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(file.updatedAt)}
            </span>
            <span>{formatFileSize(file.size)}</span>
          </div>

          {file.tags && file.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {file.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {/* Integrity status */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              checkIntegrity()
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Check file integrity"
          >
            {integrityStatus === 'checking' ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            ) : integrityStatus === 'valid' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : integrityStatus === 'invalid' ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <Filter className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 hover:bg-red-100 rounded text-red-600"
            title="Delete file"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}