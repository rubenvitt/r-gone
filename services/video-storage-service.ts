'use client'

export interface VideoMetadata {
  id: string
  filename: string
  size: number
  duration: number
  mimeType: string
  createdAt: string
  width?: number
  height?: number
  thumbnailUrl?: string
  transcription?: string
}

export interface VideoStorageItem {
  metadata: VideoMetadata
  dataUrl: string
}

export class VideoStorageService {
  private static instance: VideoStorageService
  private readonly STORAGE_KEY = 'ifimgone_video_messages'
  private readonly MAX_STORAGE_SIZE = 200 * 1024 * 1024 // 200MB limit
  private readonly THUMBNAIL_SIZE = { width: 320, height: 180 }
  
  public static getInstance(): VideoStorageService {
    if (!VideoStorageService.instance) {
      VideoStorageService.instance = new VideoStorageService()
    }
    return VideoStorageService.instance
  }

  /**
   * Save video blob to storage
   */
  async saveVideo(blob: Blob, metadata?: Partial<VideoMetadata>): Promise<string> {
    try {
      // Generate ID
      const id = metadata?.id || crypto.randomUUID()
      
      // Convert blob to data URL for storage
      const dataUrl = await this.blobToDataUrl(blob)
      
      // Get video metadata if not provided
      let duration = metadata?.duration || 0
      let width = metadata?.width
      let height = metadata?.height
      let thumbnailUrl = metadata?.thumbnailUrl
      
      if (!duration || !width || !height || !thumbnailUrl) {
        const videoMetadata = await this.getVideoMetadata(dataUrl)
        duration = duration || videoMetadata.duration
        width = width || videoMetadata.width
        height = height || videoMetadata.height
        thumbnailUrl = thumbnailUrl || videoMetadata.thumbnail
      }
      
      // Create metadata
      const videoMetadata: VideoMetadata = {
        id,
        filename: metadata?.filename || `video-${Date.now()}.webm`,
        size: blob.size,
        duration,
        width,
        height,
        thumbnailUrl,
        mimeType: blob.type || 'video/webm',
        createdAt: new Date().toISOString(),
        transcription: metadata?.transcription
      }
      
      // Check storage size
      const currentSize = await this.getStorageSize()
      if (currentSize + blob.size > this.MAX_STORAGE_SIZE) {
        throw new Error('Storage limit exceeded. Please delete some video files.')
      }
      
      // Save to storage
      const storageItem: VideoStorageItem = {
        metadata: videoMetadata,
        dataUrl
      }
      
      const storage = this.getStorage()
      storage[id] = storageItem
      this.setStorage(storage)
      
      return id
    } catch (error) {
      console.error('Failed to save video:', error)
      throw error
    }
  }

  /**
   * Get video by ID
   */
  async getVideo(id: string): Promise<VideoStorageItem | null> {
    const storage = this.getStorage()
    return storage[id] || null
  }

  /**
   * Get all video metadata
   */
  getAllVideoMetadata(): VideoMetadata[] {
    const storage = this.getStorage()
    return Object.values(storage).map(item => item.metadata)
  }

  /**
   * Delete video by ID
   */
  deleteVideo(id: string): boolean {
    const storage = this.getStorage()
    if (storage[id]) {
      delete storage[id]
      this.setStorage(storage)
      return true
    }
    return false
  }

  /**
   * Delete all videos
   */
  deleteAllVideos(): void {
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
   * Export video as file
   */
  async exportVideo(id: string): Promise<Blob | null> {
    const item = await this.getVideo(id)
    if (!item) return null
    
    return this.dataUrlToBlob(item.dataUrl)
  }

  /**
   * Import video from file
   */
  async importVideo(file: File, metadata?: Partial<VideoMetadata>): Promise<string> {
    if (!file.type.startsWith('video/')) {
      throw new Error('Invalid file type. Please select a video file.')
    }
    
    return this.saveVideo(file, {
      filename: file.name,
      ...metadata
    })
  }

  /**
   * Get video metadata from data URL
   */
  private getVideoMetadata(dataUrl: string): Promise<{
    duration: number
    width: number
    height: number
    thumbnail: string
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.src = dataUrl
      video.muted = true
      
      video.addEventListener('loadedmetadata', async () => {
        try {
          // Get duration and dimensions
          const duration = video.duration
          const width = video.videoWidth
          const height = video.videoHeight
          
          // Generate thumbnail
          video.currentTime = Math.min(1, duration / 2) // Seek to 1 second or middle
          
          video.addEventListener('seeked', async () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = this.THUMBNAIL_SIZE.width
              canvas.height = this.THUMBNAIL_SIZE.height
              
              const ctx = canvas.getContext('2d')
              if (!ctx) {
                throw new Error('Failed to get canvas context')
              }
              
              // Calculate scaling to maintain aspect ratio
              const scale = Math.min(
                canvas.width / width,
                canvas.height / height
              )
              const scaledWidth = width * scale
              const scaledHeight = height * scale
              const x = (canvas.width - scaledWidth) / 2
              const y = (canvas.height - scaledHeight) / 2
              
              ctx.drawImage(video, x, y, scaledWidth, scaledHeight)
              const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
              
              resolve({ duration, width, height, thumbnail })
            } catch (err) {
              reject(err)
            }
          }, { once: true })
        } catch (err) {
          reject(err)
        }
      })
      
      video.addEventListener('error', () => {
        reject(new Error('Failed to load video'))
      })
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
   * Get storage object
   */
  private getStorage(): Record<string, VideoStorageItem> {
    if (typeof window === 'undefined') return {}
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Failed to parse video storage:', error)
      return {}
    }
  }

  /**
   * Set storage object
   */
  private setStorage(storage: Record<string, VideoStorageItem>): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storage))
      } catch (error) {
        console.error('Failed to save video storage:', error)
        throw new Error('Failed to save video. Storage might be full.')
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
   * Clean up old video files
   */
  cleanupOldVideos(daysToKeep: number = 30): number {
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
export const videoStorageService = VideoStorageService.getInstance()