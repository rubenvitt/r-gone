'use client'

export interface AudioMetadata {
  id: string
  filename: string
  size: number
  duration: number
  mimeType: string
  createdAt: string
  transcription?: string
}

export interface AudioStorageItem {
  metadata: AudioMetadata
  dataUrl: string
}

export class AudioStorageService {
  private static instance: AudioStorageService
  private readonly STORAGE_KEY = 'ifimgone_audio_messages'
  private readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024 // 50MB limit
  
  public static getInstance(): AudioStorageService {
    if (!AudioStorageService.instance) {
      AudioStorageService.instance = new AudioStorageService()
    }
    return AudioStorageService.instance
  }

  /**
   * Save audio blob to storage
   */
  async saveAudio(blob: Blob, metadata?: Partial<AudioMetadata>): Promise<string> {
    try {
      // Generate ID
      const id = metadata?.id || crypto.randomUUID()
      
      // Convert blob to data URL for storage
      const dataUrl = await this.blobToDataUrl(blob)
      
      // Get duration if not provided
      let duration = metadata?.duration || 0
      if (!duration) {
        duration = await this.getAudioDuration(dataUrl)
      }
      
      // Create metadata
      const audioMetadata: AudioMetadata = {
        id,
        filename: metadata?.filename || `audio-${Date.now()}.webm`,
        size: blob.size,
        duration,
        mimeType: blob.type || 'audio/webm',
        createdAt: new Date().toISOString(),
        transcription: metadata?.transcription
      }
      
      // Check storage size
      const currentSize = await this.getStorageSize()
      if (currentSize + blob.size > this.MAX_STORAGE_SIZE) {
        throw new Error('Storage limit exceeded. Please delete some audio files.')
      }
      
      // Save to storage
      const storageItem: AudioStorageItem = {
        metadata: audioMetadata,
        dataUrl
      }
      
      const storage = this.getStorage()
      storage[id] = storageItem
      this.setStorage(storage)
      
      return id
    } catch (error) {
      console.error('Failed to save audio:', error)
      throw error
    }
  }

  /**
   * Get audio by ID
   */
  async getAudio(id: string): Promise<AudioStorageItem | null> {
    const storage = this.getStorage()
    return storage[id] || null
  }

  /**
   * Get all audio metadata
   */
  getAllAudioMetadata(): AudioMetadata[] {
    const storage = this.getStorage()
    return Object.values(storage).map(item => item.metadata)
  }

  /**
   * Delete audio by ID
   */
  deleteAudio(id: string): boolean {
    const storage = this.getStorage()
    if (storage[id]) {
      delete storage[id]
      this.setStorage(storage)
      return true
    }
    return false
  }

  /**
   * Delete all audio
   */
  deleteAllAudio(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  /**
   * Get total storage size
   */
  async getStorageSize(): Promise<number> {
    const storage = this.getStorage()
    let totalSize = 0
    
    for (const item of Object.values(storage)) {
      totalSize += item.metadata.size
    }
    
    return totalSize
  }

  /**
   * Export audio as file
   */
  async exportAudio(id: string): Promise<Blob | null> {
    const item = await this.getAudio(id)
    if (!item) return null
    
    return this.dataUrlToBlob(item.dataUrl)
  }

  /**
   * Import audio from file
   */
  async importAudio(file: File, metadata?: Partial<AudioMetadata>): Promise<string> {
    if (!file.type.startsWith('audio/')) {
      throw new Error('Invalid file type. Please select an audio file.')
    }
    
    return this.saveAudio(file, {
      filename: file.name,
      ...metadata
    })
  }

  /**
   * Convert blob to data URL
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Convert data URL to blob
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl)
    return response.blob()
  }

  /**
   * Get audio duration from data URL
   */
  private getAudioDuration(dataUrl: string): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio(dataUrl)
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration)
      })
      audio.addEventListener('error', () => {
        resolve(0) // Default to 0 if we can't get duration
      })
    })
  }

  /**
   * Get storage object
   */
  private getStorage(): Record<string, AudioStorageItem> {
    if (typeof window === 'undefined') return {}
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Failed to parse audio storage:', error)
      return {}
    }
  }

  /**
   * Set storage object
   */
  private setStorage(storage: Record<string, AudioStorageItem>): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storage))
      } catch (error) {
        console.error('Failed to save audio storage:', error)
        throw new Error('Failed to save audio. Storage might be full.')
      }
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalFiles: number
    totalSize: number
    totalDuration: number
    oldestFile?: string
    newestFile?: string
  } {
    const storage = this.getStorage()
    const items = Object.values(storage)
    
    if (items.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        totalDuration: 0
      }
    }
    
    let totalSize = 0
    let totalDuration = 0
    let oldest = items[0]
    let newest = items[0]
    
    items.forEach(item => {
      totalSize += item.metadata.size
      totalDuration += item.metadata.duration
      
      if (new Date(item.metadata.createdAt) < new Date(oldest.metadata.createdAt)) {
        oldest = item
      }
      if (new Date(item.metadata.createdAt) > new Date(newest.metadata.createdAt)) {
        newest = item
      }
    })
    
    return {
      totalFiles: items.length,
      totalSize,
      totalDuration,
      oldestFile: oldest.metadata.filename,
      newestFile: newest.metadata.filename
    }
  }

  /**
   * Clean up old audio files
   */
  cleanupOldAudio(daysToKeep: number = 30): number {
    const storage = this.getStorage()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    let deletedCount = 0
    
    Object.entries(storage).forEach(([id, item]) => {
      if (new Date(item.metadata.createdAt) < cutoffDate) {
        delete storage[id]
        deletedCount++
      }
    })
    
    if (deletedCount > 0) {
      this.setStorage(storage)
    }
    
    return deletedCount
  }
}

// Export singleton instance
export const audioStorageService = AudioStorageService.getInstance()