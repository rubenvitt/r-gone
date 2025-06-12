'use client'

import { useState, useCallback } from 'react'
import { FileListItem, FileMetadata, SaveResult } from '@/services/file-service'

export interface FileServiceState {
  isLoading: boolean
  error: string | null
  files: FileListItem[]
}

export interface UseFileServiceReturn {
  state: FileServiceState
  saveFile: (encryptedContent: string, options?: {
    filename?: string
    description?: string
    tags?: string[]
    fileId?: string
  }) => Promise<SaveResult>
  loadFile: (fileId: string) => Promise<{ encryptedContent: string; metadata: FileMetadata } | null>
  deleteFile: (fileId: string) => Promise<boolean>
  listFiles: (options?: {
    sortBy?: 'createdAt' | 'updatedAt' | 'filename' | 'size'
    sortOrder?: 'asc' | 'desc'
    search?: string
    tags?: string[]
  }) => Promise<void>
  getFileMetadata: (fileId: string) => Promise<FileMetadata | null>
  verifyFileIntegrity: (fileId: string) => Promise<{
    isValid: boolean
    expectedChecksum?: string
    actualChecksum?: string
    error?: string
  }>
  getStorageStats: () => Promise<{
    totalFiles: number
    totalSize: number
    oldestFile?: string
    newestFile?: string
    corruptedFiles: number
  } | null>
  clearError: () => void
}

export function useFileService(): UseFileServiceReturn {
  const [state, setState] = useState<FileServiceState>({
    isLoading: false,
    error: null,
    files: []
  })

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage
    setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
    console.error(defaultMessage, error)
  }, [])

  const saveFile = useCallback(async (
    encryptedContent: string,
    options: {
      filename?: string
      description?: string
      tags?: string[]
      fileId?: string
    } = {}
  ): Promise<SaveResult> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encryptedContent,
          ...options
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setState(prev => ({
          ...prev,
          error: result.error || 'Save failed',
          isLoading: false
        }))
        return { success: false, error: result.error || 'Save failed' }
      }

      setState(prev => ({ ...prev, isLoading: false }))
      return {
        success: true,
        fileId: result.fileId,
        version: result.version
      }
    } catch (error) {
      handleError(error, 'Failed to save file')
      return { success: false, error: 'Failed to save file' }
    }
  }, [handleError])

  const loadFile = useCallback(async (
    fileId: string
  ): Promise<{ encryptedContent: string; metadata: FileMetadata } | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`/api/files/${fileId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setState(prev => ({ ...prev, error: 'File not found', isLoading: false }))
          return null
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        setState(prev => ({
          ...prev,
          error: result.error || 'Load failed',
          isLoading: false
        }))
        return null
      }

      setState(prev => ({ ...prev, isLoading: false }))
      return {
        encryptedContent: result.content,
        metadata: result.metadata
      }
    } catch (error) {
      handleError(error, 'Failed to load file')
      return null
    }
  }, [handleError])

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!result.success) {
        setState(prev => ({
          ...prev,
          error: result.error || 'Delete failed',
          isLoading: false
        }))
        return false
      }

      setState(prev => ({ ...prev, isLoading: false }))
      return true
    } catch (error) {
      handleError(error, 'Failed to delete file')
      return false
    }
  }, [handleError])

  const listFiles = useCallback(async (options: {
    sortBy?: 'createdAt' | 'updatedAt' | 'filename' | 'size'
    sortOrder?: 'asc' | 'desc'
    search?: string
    tags?: string[]
  } = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const searchParams = new URLSearchParams()
      
      if (options.sortBy) searchParams.set('sortBy', options.sortBy)
      if (options.sortOrder) searchParams.set('sortOrder', options.sortOrder)
      if (options.search) searchParams.set('search', options.search)
      if (options.tags?.length) searchParams.set('tags', options.tags.join(','))

      const response = await fetch(`/api/files?${searchParams.toString()}`)
      const result = await response.json()

      if (!result.success) {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to list files',
          isLoading: false
        }))
        return
      }

      setState(prev => ({
        ...prev,
        files: result.files,
        isLoading: false
      }))
    } catch (error) {
      handleError(error, 'Failed to list files')
    }
  }, [handleError])

  const getFileMetadata = useCallback(async (
    fileId: string
  ): Promise<FileMetadata | null> => {
    try {
      const response = await fetch(`/api/files/${fileId}/metadata`)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to get metadata')
      }

      return result.metadata
    } catch (error) {
      console.error('Failed to get file metadata:', error)
      return null
    }
  }, [])

  const verifyFileIntegrity = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/integrity`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Integrity check failed')
      }

      return result.integrity
    } catch (error) {
      console.error('Failed to verify file integrity:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Integrity check failed'
      }
    }
  }, [])

  const getStorageStats = useCallback(async () => {
    try {
      const response = await fetch('/api/storage/stats')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to get storage stats')
      }

      return result.stats
    } catch (error) {
      console.error('Failed to get storage stats:', error)
      return null
    }
  }, [])

  return {
    state,
    saveFile,
    loadFile,
    deleteFile,
    listFiles,
    getFileMetadata,
    verifyFileIntegrity,
    getStorageStats,
    clearError
  }
}