'use client'

import { useState, useMemo } from 'react'
import {
  X,
  Search,
  Filter,
  FileText,
  Heart,
  DollarSign,
  Stethoscope,
  Scale,
  Church,
  Lock,
  Phone,
  Brain,
  MessageSquare,
  Smile,
  Star,
  Archive,
  Briefcase,
  Palette,
  Sparkles,
  MoreVertical,
  CheckCircle,
  Info,
  Copy,
  Edit,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  MessagesLibrary,
  MessageTemplate,
  MessageType,
  TemplateCategory,
  TemplateVariable
} from '@/types/data'

interface MessageTemplateSelectorProps {
  library: MessagesLibrary
  onSelectTemplate: (template: MessageTemplate) => void
  onClose: () => void
}

export default function MessageTemplateSelector({
  library,
  onSelectTemplate,
  onClose
}: MessageTemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<MessageType | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null)
  const [showOnlySystem, setShowOnlySystem] = useState(false)

  // Get message type icon
  const getMessageTypeIcon = (type: MessageType) => {
    const iconMap: Record<MessageType, any> = {
      personal: Heart,
      instruction: FileText,
      financial: DollarSign,
      medical: Stethoscope,
      legal: Scale,
      funeral: Church,
      password: Lock,
      emergency: Phone,
      farewell: MessageSquare,
      memory: Brain,
      advice: MessageSquare,
      confession: Lock,
      gratitude: Smile,
      apology: Heart,
      wish: Star,
      legacy: Archive,
      business: Briefcase,
      creative: Palette,
      spiritual: Sparkles,
      custom: MoreVertical
    }
    return iconMap[type] || MessageSquare
  }

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = library.templates

    // Apply filters
    if (showOnlySystem) {
      templates = templates.filter(t => t.isSystem)
    }
    if (selectedType !== 'all') {
      templates = templates.filter(t => t.type === selectedType)
    }
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory)
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search))
      )
    }

    // Sort by rating and usage
    return templates.sort((a, b) => {
      const ratingA = a.rating || 0
      const ratingB = b.rating || 0
      if (ratingA !== ratingB) return ratingB - ratingA
      return b.usage - a.usage
    })
  }, [library.templates, showOnlySystem, selectedType, selectedCategory, searchTerm])

  // Handle template selection
  const handleSelectTemplate = (template: MessageTemplate) => {
    onSelectTemplate(template)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Choose a Message Template</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select from our curated templates or create your own
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as MessageType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {Object.entries({
                farewell: 'Farewell',
                financial: 'Financial',
                medical: 'Medical',
                instruction: 'Instructions',
                personal: 'Personal',
                legal: 'Legal',
                memory: 'Memories',
                advice: 'Advice',
                gratitude: 'Gratitude'
              }).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="farewell">Farewell</option>
              <option value="instructions">Instructions</option>
              <option value="financial">Financial</option>
              <option value="medical">Medical</option>
              <option value="personal">Personal</option>
              <option value="business">Business</option>
              <option value="creative">Creative</option>
              <option value="spiritual">Spiritual</option>
              <option value="general">General</option>
            </select>

            {/* System templates toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showOnlySystem}
                onChange={(e) => setShowOnlySystem(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">System templates only</span>
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-200px)]">
          {/* Templates List */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-600 mb-2">No templates found</p>
                <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => {
                  const TypeIcon = getMessageTypeIcon(template.type)
                  return (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                        previewTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <TypeIcon className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{template.name}</h3>
                            <p className="text-sm text-gray-500">{template.description}</p>
                          </div>
                        </div>
                        {template.isSystem && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            System
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4 text-gray-500">
                          {template.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 fill-current text-yellow-500" />
                              <span>{template.rating.toFixed(1)}</span>
                            </div>
                          )}
                          <span>Used {template.usage} times</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewTemplate(template)
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectTemplate(template)
                            }}
                          >
                            Use Template
                          </Button>
                        </div>
                      </div>

                      {template.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {template.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {previewTemplate && (
            <div className="w-96 border-l bg-gray-50 p-6 overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">{previewTemplate.name}</h3>
                <p className="text-sm text-gray-600">{previewTemplate.description}</p>
              </div>

              {/* Template Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Type</p>
                  <p className="text-sm capitalize">{previewTemplate.type}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Category</p>
                  <p className="text-sm capitalize">{previewTemplate.category}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Format</p>
                  <p className="text-sm capitalize">{previewTemplate.content.format}</p>
                </div>
                {previewTemplate.author && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Author</p>
                    <p className="text-sm">{previewTemplate.author}</p>
                  </div>
                )}
              </div>

              {/* Variables */}
              {previewTemplate.variables.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    Template Variables
                  </h4>
                  <div className="space-y-2">
                    {previewTemplate.variables.map((variable) => (
                      <div key={variable.name} className="p-3 bg-white rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{variable.label}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Variable: <code className="bg-gray-100 px-1 py-0.5 rounded">
                                {`{{${variable.name}}}`}
                              </code>
                            </p>
                          </div>
                          {variable.required && (
                            <span className="text-xs text-red-600">Required</span>
                          )}
                        </div>
                        {variable.placeholder && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            {variable.placeholder}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Preview */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Content Preview</h4>
                <div className="bg-white p-4 rounded-lg border">
                  {previewTemplate.content.content.text && (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: previewTemplate.content.content.text.slice(0, 500) + 
                          (previewTemplate.content.content.text.length > 500 ? '...' : '')
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => handleSelectTemplate(previewTemplate)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Use This Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // TODO: Implement template duplication
                    console.log('Duplicate template:', previewTemplate.id)
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}