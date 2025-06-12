'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import { 
  Upload, 
  Search, 
  Grid, 
  List, 
  Edit, 
  Trash2, 
  Star, 
  StarOff,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  Archive,
  File,
  FolderOpen,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import DocumentEditForm from '@/components/ui/DocumentEditForm'
import { 
  DocumentEntry, 
  DocumentRepository as DocumentRepositoryType, 
  DocumentCategory, 
  DocumentFileType,
  DocumentFilter 
} from '@/types/data'
import { documentRepositoryService } from '@/services/document-repository-service'

interface DocumentRepositoryProps {
  repository: DocumentRepositoryType
  onRepositoryChange: (repository: DocumentRepositoryType) => void
  className?: string
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'category' | 'type'

export default function DocumentRepository({ 
  repository, 
  onRepositoryChange, 
  className = '' 
}: DocumentRepositoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<DocumentFilter>({})
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let documents = repository.documents

    // Apply search
    if (searchTerm) {
      const searchResults = documentRepositoryService.searchDocuments(repository, searchTerm)
      documents = searchResults.map(result => result.document)
    }

    // Apply filters
    documents = documentRepositoryService.filterDocuments(repository, filter)

    // Sort documents
    documents.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename)
        case 'date':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'size':
          return b.fileSize - a.fileSize
        case 'category':
          return a.category.localeCompare(b.category)
        case 'type':
          return a.fileType.localeCompare(b.fileType)
        default:
          return 0
      }
    })

    return documents
  }, [repository, searchTerm, filter, sortBy])

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const updatedRepository = await documentRepositoryService.addDocument(repository, {
          file,
          category: 'other',
          description: '',
          tags: []
        })
        onRepositoryChange(updatedRepository)
      } catch (error) {
        console.error('Failed to upload file:', error)
        alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }, [repository, onRepositoryChange])

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [handleFileUpload])

  // Toggle favorite
  const toggleFavorite = useCallback((documentId: string) => {
    const document = repository.documents.find(d => d.id === documentId)
    if (document) {
      const updatedRepository = documentRepositoryService.updateDocument(repository, documentId, {
        isFavorite: !document.isFavorite
      })
      onRepositoryChange(updatedRepository)
    }
  }, [repository, onRepositoryChange])

  // Delete document
  const handleDeleteDocument = useCallback((documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      const updatedRepository = documentRepositoryService.deleteDocument(repository, documentId)
      onRepositoryChange(updatedRepository)
      setSelectedDocument(null)
    }
  }, [repository, onRepositoryChange])

  // Get file type icon
  const getFileTypeIcon = useCallback((fileType: DocumentFileType) => {
    switch (fileType) {
      case 'pdf': return <FileText className="h-5 w-5 text-red-600" />
      case 'image': return <ImageIcon className="h-5 w-5 text-green-600" />
      case 'document': return <FileText className="h-5 w-5 text-blue-600" />
      case 'spreadsheet': return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
      case 'presentation': return <Presentation className="h-5 w-5 text-orange-600" />
      case 'archive': return <Archive className="h-5 w-5 text-purple-600" />
      case 'text': return <FileText className="h-5 w-5 text-gray-600" />
      default: return <File className="h-5 w-5 text-gray-500" />
    }
  }, [])

  // Get category icon
  const getCategoryIcon = useCallback((category: DocumentCategory) => {
    const iconMap = {
      legal: '⚖️',
      medical: '🏥',
      financial: '💰',
      personal: '👤',
      business: '💼',
      insurance: '🛡️',
      tax: '📊',
      identification: '🆔',
      property: '🏠',
      education: '🎓',
      other: '📋'
    }
    return iconMap[category] || '📋'
  }, [])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Document Repository</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{repository.statistics.totalDocuments}</div>
            <div className="text-sm text-blue-800">Total Documents</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {documentRepositoryService.formatFileSize(repository.statistics.totalSize)}
            </div>
            <div className="text-sm text-green-800">Total Size</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(repository.statistics.documentsByCategory).length}
            </div>
            <div className="text-sm text-purple-800">Categories</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {repository.documents.filter(d => d.isFavorite).length}
            </div>
            <div className="text-sm text-orange-800">Favorites</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filter.category || 'all'}
            onChange={(e) => setFilter(prev => ({ 
              ...prev, 
              category: e.target.value === 'all' ? undefined : e.target.value as DocumentCategory 
            }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {repository.categories.map(category => (
              <option key={category} value={category}>
                {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          {/* File Type Filter */}
          <select
            value={filter.fileType || 'all'}
            onChange={(e) => setFilter(prev => ({ 
              ...prev, 
              fileType: e.target.value === 'all' ? undefined : e.target.value as DocumentFileType 
            }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="pdf">PDF</option>
            <option value="image">Images</option>
            <option value="document">Documents</option>
            <option value="spreadsheet">Spreadsheets</option>
            <option value="presentation">Presentations</option>
            <option value="text">Text Files</option>
            <option value="archive">Archives</option>
            <option value="other">Other</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="category">Sort by Category</option>
            <option value="type">Sort by Type</option>
          </select>

          {/* View Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Document Grid/List */}
      <div 
        className="bg-white rounded-lg shadow-sm border min-h-[400px]"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {filteredDocuments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No documents found</p>
            <p>
              {searchTerm || filter.category || filter.fileType 
                ? 'Try adjusting your search or filters.' 
                : 'Upload your first document to get started.'
              }
            </p>
            {!searchTerm && !filter.category && !filter.fileType && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Document
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onToggleFavorite={() => toggleFavorite(document.id)}
                onEdit={() => setSelectedDocument(document.id)}
                onDelete={() => handleDeleteDocument(document.id)}
                getFileTypeIcon={getFileTypeIcon}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((document) => (
              <DocumentListItem
                key={document.id}
                document={document}
                onToggleFavorite={() => toggleFavorite(document.id)}
                onEdit={() => setSelectedDocument(document.id)}
                onDelete={() => handleDeleteDocument(document.id)}
                getFileTypeIcon={getFileTypeIcon}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        className="hidden"
        accept={repository.settings.allowedFileTypes.join(',')}
      />

      {/* Document Edit Modal */}
      {selectedDocument && (
        <DocumentEditModal
          document={repository.documents.find(d => d.id === selectedDocument)!}
          repository={repository}
          onSave={(updatedDocument) => {
            const updatedRepository = documentRepositoryService.updateDocument(
              repository, 
              selectedDocument, 
              updatedDocument
            )
            onRepositoryChange(updatedRepository)
            setSelectedDocument(null)
          }}
          onCancel={() => setSelectedDocument(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <DocumentRepositorySettings
          repository={repository}
          onSave={(updatedRepository) => {
            onRepositoryChange(updatedRepository)
            setShowSettings(false)
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

// Document Card Component for Grid View
interface DocumentCardProps {
  document: DocumentEntry
  onToggleFavorite: () => void
  onEdit: () => void
  onDelete: () => void
  getFileTypeIcon: (fileType: DocumentFileType) => React.ReactNode
  getCategoryIcon: (category: DocumentCategory) => string
}

function DocumentCard({
  document,
  onToggleFavorite,
  onEdit,
  onDelete,
  getFileTypeIcon,
  getCategoryIcon
}: DocumentCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        {getFileTypeIcon(document.fileType)}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFavorite}
        >
          {document.isFavorite ? (
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          ) : (
            <StarOff className="h-4 w-4 text-gray-400" />
          )}
        </Button>
      </div>

      {/* Thumbnail */}
      {document.thumbnail ? (
        <div className="mb-3 aspect-[4/5] bg-gray-50 rounded overflow-hidden relative">
          <Image 
            src={document.thumbnail} 
            alt={document.filename}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="mb-3 aspect-[4/5] bg-gray-50 rounded flex items-center justify-center">
          {getFileTypeIcon(document.fileType)}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-medium text-sm truncate" title={document.filename}>
          {document.filename}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{getCategoryIcon(document.category)} {document.category}</span>
          <span>{documentRepositoryService.formatFileSize(document.fileSize)}</span>
        </div>

        {document.description && (
          <p className="text-xs text-gray-600 line-clamp-2">
            {document.description}
          </p>
        )}

        <div className="flex justify-end space-x-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Document List Item Component for List View
interface DocumentListItemProps extends DocumentCardProps {}

function DocumentListItem({
  document,
  onToggleFavorite,
  onEdit,
  onDelete,
  getFileTypeIcon,
  getCategoryIcon
}: DocumentListItemProps) {
  return (
    <div className="p-4 hover:bg-gray-50 flex items-center space-x-4">
      <div className="flex-shrink-0">
        {getFileTypeIcon(document.fileType)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-gray-900 truncate">{document.filename}</h3>
          {document.isFavorite && (
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          )}
        </div>
        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
          <span>{getCategoryIcon(document.category)} {document.category}</span>
          <span>{documentRepositoryService.formatFileSize(document.fileSize)}</span>
          <span>{new Date(document.updatedAt).toLocaleDateString()}</span>
        </div>
        {document.description && (
          <p className="text-sm text-gray-600 mt-1 truncate">{document.description}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={onToggleFavorite}>
          {document.isFavorite ? (
            <StarOff className="h-4 w-4" />
          ) : (
            <Star className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Document Edit Modal using the dedicated form component
function DocumentEditModal({ document, repository, onSave, onCancel }: any) {
  return (
    <DocumentEditForm
      document={document}
      repository={repository}
      onSave={onSave}
      onCancel={onCancel}
    />
  )
}

function DocumentRepositorySettings({ repository, onSave, onCancel }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Repository Settings</h3>
        <p className="text-gray-600">Settings form would go here...</p>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(repository)}>Save</Button>
        </div>
      </div>
    </div>
  )
}