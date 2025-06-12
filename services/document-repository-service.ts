'use client'

import { 
  DocumentEntry, 
  DocumentRepository, 
  DocumentCategory, 
  DocumentFileType, 
  DocumentMetadata,
  DocumentVersion,
  DocumentSearchResult,
  DocumentFilter
} from '@/types/data'

export interface FileUploadOptions {
  file: File
  category?: DocumentCategory
  description?: string
  tags?: string[]
  replaceExisting?: boolean
}

export interface DocumentAnalysisResult {
  fileType: DocumentFileType
  metadata: DocumentMetadata
  thumbnail?: string
  ocrText?: string
}

export class DocumentRepositoryService {
  private static instance: DocumentRepositoryService
  
  public static getInstance(): DocumentRepositoryService {
    if (!DocumentRepositoryService.instance) {
      DocumentRepositoryService.instance = new DocumentRepositoryService()
    }
    return DocumentRepositoryService.instance
  }

  /**
   * Create a new empty document repository
   */
  createEmptyRepository(): DocumentRepository {
    return {
      documents: [],
      categories: ['legal', 'medical', 'financial', 'personal', 'business', 'insurance', 'tax', 'identification', 'property', 'education', 'other'],
      settings: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedFileTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'text/plain',
          'text/markdown',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ],
        enableOCR: true,
        generateThumbnails: true,
        compressionLevel: 6,
        versionRetention: {
          maxVersions: 10,
          maxAgeInDays: 365
        },
        thumbnails: {
          enabled: true,
          width: 200,
          height: 250,
          quality: 0.8
        }
      },
      statistics: {
        totalDocuments: 0,
        totalSize: 0,
        documentsByCategory: {
          legal: 0,
          medical: 0,
          financial: 0,
          personal: 0,
          business: 0,
          insurance: 0,
          tax: 0,
          identification: 0,
          property: 0,
          education: 0,
          other: 0
        },
        documentsByType: {
          pdf: 0,
          image: 0,
          text: 0,
          document: 0,
          spreadsheet: 0,
          presentation: 0,
          archive: 0,
          other: 0
        },
        lastAnalysis: new Date().toISOString()
      }
    }
  }

  /**
   * Add a new document to the repository
   */
  async addDocument(repository: DocumentRepository, options: FileUploadOptions): Promise<DocumentRepository> {
    const { file, category = 'other', description, tags = [] } = options

    // Validate file
    this.validateFile(file, repository.settings)

    // Read file content
    const fileContent = await this.readFileAsArrayBuffer(file)
    const base64Content = this.arrayBufferToBase64(fileContent)

    // Analyze file
    const analysis = await this.analyzeFile(file, fileContent)

    // Generate thumbnail if applicable
    let thumbnail: string | undefined
    if (repository.settings.thumbnails.enabled && this.canGenerateThumbnail(analysis.fileType)) {
      thumbnail = await this.generateThumbnail(file, fileContent, repository.settings.thumbnails)
    }

    // Create document entry
    const document: DocumentEntry = {
      id: crypto.randomUUID(),
      filename: this.sanitizeFilename(file.name),
      originalFilename: file.name,
      fileType: analysis.fileType,
      mimeType: file.type,
      fileSize: file.size,
      encryptedContent: base64Content, // This would be encrypted in real implementation
      thumbnail,
      category,
      tags,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      metadata: analysis.metadata,
      versions: [],
      ocrText: analysis.ocrText
    }

    const updatedRepository = {
      ...repository,
      documents: [...repository.documents, document]
    }

    return this.updateStatistics(updatedRepository)
  }

  /**
   * Update an existing document
   */
  async updateDocument(
    repository: DocumentRepository, 
    documentId: string, 
    updates: Partial<DocumentEntry>
  ): Promise<DocumentRepository> {
    const documentIndex = repository.documents.findIndex(d => d.id === documentId)
    if (documentIndex === -1) {
      throw new Error('Document not found')
    }

    const currentDocument = repository.documents[documentId]
    const updatedDocument: DocumentEntry = {
      ...currentDocument,
      ...updates,
      id: documentId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    }

    const updatedDocuments = [...repository.documents]
    updatedDocuments[documentIndex] = updatedDocument

    const updatedRepository = {
      ...repository,
      documents: updatedDocuments
    }

    return this.updateStatistics(updatedRepository)
  }

  /**
   * Delete a document
   */
  deleteDocument(repository: DocumentRepository, documentId: string): DocumentRepository {
    const updatedRepository = {
      ...repository,
      documents: repository.documents.filter(d => d.id !== documentId)
    }

    return this.updateStatistics(updatedRepository)
  }

  /**
   * Search documents
   */
  searchDocuments(repository: DocumentRepository, query: string): DocumentSearchResult[] {
    if (!query.trim()) {
      return repository.documents.map(doc => ({
        document: doc,
        relevanceScore: 1,
        matchedFields: [],
        highlights: []
      }))
    }

    const searchTerm = query.toLowerCase()
    const results: DocumentSearchResult[] = []

    repository.documents.forEach(document => {
      let relevanceScore = 0
      const matchedFields: string[] = []
      const highlights: DocumentSearchResult['highlights'] = []

      // Search in filename
      if (document.filename.toLowerCase().includes(searchTerm)) {
        relevanceScore += 10
        matchedFields.push('filename')
      }

      // Search in description
      if (document.description?.toLowerCase().includes(searchTerm)) {
        relevanceScore += 8
        matchedFields.push('description')
      }

      // Search in tags
      if (document.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) {
        relevanceScore += 6
        matchedFields.push('tags')
      }

      // Search in OCR text
      if (document.ocrText?.toLowerCase().includes(searchTerm)) {
        relevanceScore += 5
        matchedFields.push('ocrText')
      }

      // Search in metadata
      if (document.metadata?.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm))) {
        relevanceScore += 4
        matchedFields.push('metadata')
      }

      if (relevanceScore > 0) {
        results.push({
          document,
          relevanceScore,
          matchedFields,
          highlights
        })
      }
    })

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Filter documents
   */
  filterDocuments(repository: DocumentRepository, filter: DocumentFilter): DocumentEntry[] {
    let documents = repository.documents

    // Category filter
    if (filter.category && filter.category !== 'all') {
      documents = documents.filter(doc => doc.category === filter.category)
    }

    // File type filter
    if (filter.fileType && filter.fileType !== 'all') {
      documents = documents.filter(doc => doc.fileType === filter.fileType)
    }

    // Date range filter
    if (filter.dateRange) {
      const fromDate = new Date(filter.dateRange.from)
      const toDate = new Date(filter.dateRange.to)
      documents = documents.filter(doc => {
        const docDate = new Date(doc.createdAt)
        return docDate >= fromDate && docDate <= toDate
      })
    }

    // Size range filter
    if (filter.sizeRange) {
      documents = documents.filter(doc => 
        doc.fileSize >= filter.sizeRange!.min && doc.fileSize <= filter.sizeRange!.max
      )
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      documents = documents.filter(doc =>
        doc.tags?.some(tag => filter.tags!.includes(tag))
      )
    }

    // Archived filter
    if (filter.isArchived !== undefined) {
      documents = documents.filter(doc => !!doc.isArchived === filter.isArchived)
    }

    // Favorite filter
    if (filter.isFavorite !== undefined) {
      documents = documents.filter(doc => !!doc.isFavorite === filter.isFavorite)
    }

    // OCR filter
    if (filter.hasOCR !== undefined) {
      documents = documents.filter(doc => !!doc.ocrText === filter.hasOCR)
    }

    return documents
  }

  /**
   * Get documents by category
   */
  getDocumentsByCategory(repository: DocumentRepository, category: DocumentCategory): DocumentEntry[] {
    return repository.documents.filter(doc => doc.category === category)
  }

  /**
   * Get documents by type
   */
  getDocumentsByType(repository: DocumentRepository, fileType: DocumentFileType): DocumentEntry[] {
    return repository.documents.filter(doc => doc.fileType === fileType)
  }

  /**
   * Validate file for upload
   */
  private validateFile(file: File, settings: DocumentRepository['settings']): void {
    // Check file size
    if (file.size > settings.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.formatFileSize(settings.maxFileSize)}`)
    }

    // Check file type
    if (!settings.allowedFileTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`)
    }
  }

  /**
   * Read file as ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
    return btoa(binary)
  }

  /**
   * Analyze file and extract metadata
   */
  private async analyzeFile(file: File, content: ArrayBuffer): Promise<DocumentAnalysisResult> {
    const fileType = this.detectFileType(file)
    const metadata: DocumentMetadata = {
      author: undefined,
      subject: undefined,
      keywords: [],
      pageCount: undefined,
      wordCount: undefined,
      language: undefined,
      creationDate: undefined,
      modificationDate: undefined,
      application: undefined,
      format: file.type,
      dimensions: undefined,
      dpi: undefined,
      colorSpace: undefined,
      hasPassword: false,
      isEncrypted: false
    }

    let ocrText: string | undefined

    // Basic metadata extraction based on file type
    if (fileType === 'image') {
      try {
        // Would use a library like exif-js for real EXIF extraction
        metadata.dimensions = await this.getImageDimensions(file)
      } catch (error) {
        console.warn('Failed to extract image metadata:', error)
      }
    }

    // OCR processing for images and PDFs
    if ((fileType === 'image' || fileType === 'pdf') && this.isOCRSupported()) {
      try {
        ocrText = await this.performOCR(file, content)
        if (ocrText) {
          metadata.wordCount = ocrText.split(/\s+/).length
        }
      } catch (error) {
        console.warn('OCR processing failed:', error)
      }
    }

    return {
      fileType,
      metadata,
      ocrText
    }
  }

  /**
   * Detect file type from file object
   */
  private detectFileType(file: File): DocumentFileType {
    const mimeType = file.type
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (mimeType === 'application/pdf') return 'pdf'
    
    if (mimeType.startsWith('image/')) return 'image'
    
    if (mimeType.startsWith('text/') || ['txt', 'md', 'markdown'].includes(extension || '')) {
      return 'text'
    }
    
    if ([
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ].includes(mimeType)) {
      return 'document'
    }
    
    if ([
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ].includes(mimeType)) {
      return 'spreadsheet'
    }
    
    if ([
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ].includes(mimeType)) {
      return 'presentation'
    }
    
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return 'archive'
    }
    
    return 'other'
  }

  /**
   * Get image dimensions
   */
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.width, height: img.height })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }
      
      img.src = url
    })
  }

  /**
   * Check if thumbnail generation is supported for file type
   */
  private canGenerateThumbnail(fileType: DocumentFileType): boolean {
    return ['image', 'pdf'].includes(fileType)
  }

  /**
   * Generate thumbnail for supported file types
   */
  private async generateThumbnail(
    file: File, 
    content: ArrayBuffer, 
    settings: DocumentRepository['settings']['thumbnails']
  ): Promise<string> {
    if (file.type.startsWith('image/')) {
      return this.generateImageThumbnail(file, settings)
    }
    
    // For PDFs, we would need a PDF library like pdf-lib or PDF.js
    // For now, return a placeholder
    return this.generatePlaceholderThumbnail(settings)
  }

  /**
   * Generate thumbnail for image files
   */
  private generateImageThumbnail(
    file: File, 
    settings: DocumentRepository['settings']['thumbnails']
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }
      
      img.onload = () => {
        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = img.width / img.height
        let { width, height } = settings
        
        if (aspectRatio > width / height) {
          height = width / aspectRatio
        } else {
          width = height * aspectRatio
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', settings.quality)
        resolve(dataUrl)
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Generate placeholder thumbnail
   */
  private generatePlaceholderThumbnail(settings: DocumentRepository['settings']['thumbnails']): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return ''
    
    canvas.width = settings.width
    canvas.height = settings.height
    
    // Draw simple placeholder
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.fillStyle = '#9ca3af'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('📄', canvas.width / 2, canvas.height / 2)
    
    return canvas.toDataURL('image/png')
  }

  /**
   * Check if OCR is supported
   */
  private isOCRSupported(): boolean {
    // In a real implementation, check if Tesseract.js is available
    return false // Disabled for now
  }

  /**
   * Perform OCR on file
   */
  private async performOCR(file: File, content: ArrayBuffer): Promise<string> {
    // In a real implementation, use Tesseract.js
    // const { createWorker } = await import('tesseract.js')
    // const worker = await createWorker('eng')
    // const { data: { text } } = await worker.recognize(file)
    // await worker.terminate()
    // return text
    
    return '' // Placeholder
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(filename: string): string {
    return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_')
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Update repository statistics
   */
  private updateStatistics(repository: DocumentRepository): DocumentRepository {
    const stats = {
      totalDocuments: repository.documents.length,
      totalSize: repository.documents.reduce((sum, doc) => sum + doc.fileSize, 0),
      documentsByCategory: {} as Record<DocumentCategory, number>,
      documentsByType: {} as Record<DocumentFileType, number>,
      lastAnalysis: new Date().toISOString()
    }

    // Initialize counts
    repository.categories.forEach(category => {
      stats.documentsByCategory[category] = 0
    })

    const fileTypes: DocumentFileType[] = ['pdf', 'image', 'text', 'document', 'spreadsheet', 'presentation', 'archive', 'other']
    fileTypes.forEach(type => {
      stats.documentsByType[type] = 0
    })

    // Count documents
    repository.documents.forEach(doc => {
      stats.documentsByCategory[doc.category]++
      stats.documentsByType[doc.fileType]++
    })

    return {
      ...repository,
      statistics: stats
    }
  }
}

// Export singleton instance
export const documentRepositoryService = DocumentRepositoryService.getInstance()