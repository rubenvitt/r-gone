'use client'

import { useState, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Clock,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Info,
  Sparkles,
  BookOpen,
  Star,
  TrendingUp,
  Package,
  Layers,
  FileText,
  Users,
  Shield
} from 'lucide-react'
import { 
  Template, 
  TemplateCategory, 
  TemplateScenario, 
  TemplateLibrary as TemplateLibraryType,
  TemplateField
} from '@/types/templates'
import { templateLibraryService } from '@/services/template-library-service'

interface TemplateLibraryProps {
  isOpen: boolean
  onClose: () => void
  onApplyTemplate: (templateId: string, fieldValues: Record<string, unknown>) => void
  mode?: 'browse' | 'apply'
}

export default function TemplateLibrary({ 
  isOpen, 
  onClose, 
  onApplyTemplate,
  mode = 'browse'
}: TemplateLibraryProps) {
  const [library] = useState<TemplateLibraryType>(() => 
    templateLibraryService.getDefaultLibrary()
  )
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = library.templates

    // Category filter
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.categoryId === selectedCategory)
    }

    // Search filter
    if (searchTerm) {
      templates = templateLibraryService.searchTemplates(library, searchTerm)
    }

    return templates
  }, [library, selectedCategory, searchTerm])

  // Get recommended scenarios
  const recommendedScenarios = useMemo(() => {
    return library.scenarios.filter(s => s.isRecommended)
  }, [library])

  // Handle template selection
  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template)
    if (mode === 'apply') {
      // Initialize field values with defaults
      const initialValues: Record<string, unknown> = {}
      template.fields.forEach(field => {
        initialValues[field.id] = field.defaultValue || ''
      })
      setFieldValues(initialValues)
      setShowApplyDialog(true)
    }
  }, [mode])

  // Handle field value change
  const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }))
    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldId]
      return newErrors
    })
  }, [])

  // Validate fields
  const validateFields = useCallback((): boolean => {
    if (!selectedTemplate) return false

    const errors: Record<string, string> = {}
    
    selectedTemplate.fields.forEach(field => {
      const value = fieldValues[field.id]
      
      if (field.required && (!value || value === '')) {
        errors[field.id] = `${field.label} is required`
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [selectedTemplate, fieldValues])

  // Handle apply template
  const handleApply = useCallback(() => {
    if (!selectedTemplate || !validateFields()) return

    onApplyTemplate(selectedTemplate.id, fieldValues)
    setShowApplyDialog(false)
    setSelectedTemplate(null)
    setFieldValues({})
    onClose()
  }, [selectedTemplate, fieldValues, validateFields, onApplyTemplate, onClose])

  // Get category icon component
  const getCategoryIcon = (category: TemplateCategory) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      'essential': Shield,
      'family': Users,
      'financial': TrendingUp,
      'digital': Package,
      'medical': FileText,
      'legal': FileText
    }
    const Icon = iconMap[category.id] || Layers
    return <Icon className="h-5 w-5" />
  }

  // Render field input
  const renderFieldInput = (field: TemplateField) => {
    const value = fieldValues[field.id] || ''
    const error = validationErrors[field.id]

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={error ? 'border-red-500' : ''}
              rows={4}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select value={value} onValueChange={(v) => handleFieldChange(field.id, v)}>
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )

      case 'boolean':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <Label htmlFor={field.id} className="font-normal">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        )

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Template Library</DialogTitle>
            <DialogDescription>
              Choose from pre-built templates to quickly set up your digital legacy
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="templates" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Browse Templates</TabsTrigger>
              <TabsTrigger value="scenarios">Quick Start Scenarios</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="flex-1 overflow-hidden flex flex-col space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {library.categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="flex items-center">
                          <span className="mr-2">{category.icon}</span>
                          {category.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {filteredTemplates.map(template => {
                    const category = library.categories.find(c => c.id === template.categoryId)
                    return (
                      <Card 
                        key={template.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">{template.icon}</div>
                              <div>
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {template.shortDescription}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {category?.name}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {template.timeEstimate} min
                              </span>
                              <span className="flex items-center">
                                <Star className="h-3 w-3 mr-1" />
                                {template.metadata.rating}
                              </span>
                            </div>
                            <Badge variant={
                              template.difficulty === 'beginner' ? 'default' :
                              template.difficulty === 'intermediate' ? 'secondary' :
                              'outline'
                            }>
                              {template.difficulty}
                            </Badge>
                          </div>
                          {template.preview && (
                            <div className="mt-3 space-y-1">
                              {template.preview.items.map((item, index) => (
                                <div key={index} className="flex items-center text-xs text-gray-600">
                                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                  {item.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scenarios" className="flex-1 overflow-y-auto space-y-4">
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Quick Start Scenarios</AlertTitle>
                <AlertDescription>
                  These bundles include multiple templates to help you get started quickly
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {recommendedScenarios.map(scenario => {
                  const templates = scenario.templateIds.map(id => 
                    library.templates.find(t => t.id === id)
                  ).filter(Boolean) as Template[]

                  return (
                    <Card key={scenario.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{scenario.name}</CardTitle>
                            <CardDescription>{scenario.description}</CardDescription>
                          </div>
                          {scenario.isRecommended && (
                            <Badge className="bg-green-100 text-green-800">
                              Recommended
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">
                            Includes {templates.length} templates:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {templates.map(template => (
                              <div 
                                key={template.id}
                                className="flex items-center p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSelectTemplate(template)}
                              >
                                <span className="text-xl mr-2">{template.icon}</span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{template.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {template.timeEstimate} min
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      {selectedTemplate && showApplyDialog && (
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span className="text-2xl">{selectedTemplate.icon}</span>
                <span>{selectedTemplate.name}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate.description}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>What this template will create:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {selectedTemplate.preview?.items.map((item, index) => (
                      <li key={index}>{item.description}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {selectedTemplate.fields.map(field => renderFieldInput(field))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApply}>
                Apply Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}