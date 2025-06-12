'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { DocumentEntry, DocumentCategory, DocumentRepository } from '@/types/data'
import { Star, StarOff } from 'lucide-react'

interface DocumentEditFormProps {
  document: DocumentEntry
  repository: DocumentRepository
  onSave: (updates: Partial<DocumentEntry>) => void
  onCancel: () => void
}

export default function DocumentEditForm({ 
  document, 
  repository, 
  onSave, 
  onCancel 
}: DocumentEditFormProps) {
  const [formData, setFormData] = useState({
    filename: document.filename,
    description: document.description || '',
    category: document.category,
    tags: document.tags?.join(', ') || '',
    isFavorite: document.isFavorite || false,
    isArchived: document.isArchived || false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.filename.trim()) {
      newErrors.filename = 'Filename is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const updates = {
      filename: formData.filename.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      isFavorite: formData.isFavorite,
      isArchived: formData.isArchived
    }

    onSave(updates)
  }, [formData, validateForm, onSave])

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Edit Document</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Document Info (Read-only) */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Original:</strong> {document.originalFilename}</div>
              <div><strong>Type:</strong> {document.fileType}</div>
              <div><strong>Size:</strong> {(document.fileSize / 1024).toFixed(1)} KB</div>
              <div><strong>Created:</strong> {new Date(document.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Filename */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filename *
            </label>
            <input
              type="text"
              value={formData.filename}
              onChange={(e) => handleInputChange('filename', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${ 
                errors.filename ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Document filename"
            />
            {errors.filename && (
              <p className="text-red-500 text-xs mt-1">{errors.filename}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief description of the document..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {repository.categories.map(category => (
                <option key={category} value={category}>
                  {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="important, legal, backup (comma separated)"
            />
            <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
          </div>

          {/* Status Options */}
          <div className="space-y-3">
            {/* Favorite */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="favorite"
                checked={formData.isFavorite}
                onChange={(e) => handleInputChange('isFavorite', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="favorite" className="text-sm text-gray-700 flex items-center cursor-pointer">
                {formData.isFavorite ? (
                  <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                ) : (
                  <StarOff className="h-4 w-4 text-gray-400 mr-1" />
                )}
                Mark as favorite
              </label>
            </div>

            {/* Archived */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="archived"
                checked={formData.isArchived}
                onChange={(e) => handleInputChange('isArchived', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="archived" className="text-sm text-gray-700 cursor-pointer">
                Archive document
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} type="button">
              Cancel
            </Button>
            <Button type="submit">
              Update Document
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}