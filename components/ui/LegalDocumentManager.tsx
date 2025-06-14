'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, Plus, Upload, Download, Edit, Trash, 
  Share2, User, Calendar, CheckCircle, XCircle, 
  AlertCircle, Shield, Lock, Unlock, Eye, EyeOff,
  Gavel, BookOpen, Users, Clock, PenTool, FileCheck,
  AlertTriangle, Info, ChevronRight, Archive
} from 'lucide-react'

interface LegalDocument {
  id: string
  type: string
  title: string
  description: string
  status: string
  jurisdiction: {
    country: string
    state?: string
  }
  createdAt: string
  updatedAt: string
  signatures: any[]
  witnesses: any[]
  notarization?: any
  courtAdmissible: boolean
}

const documentTypes = [
  { value: 'will', label: 'Will' },
  { value: 'living_will', label: 'Living Will' },
  { value: 'power_of_attorney', label: 'Power of Attorney' },
  { value: 'healthcare_proxy', label: 'Healthcare Proxy' },
  { value: 'trust', label: 'Trust' },
  { value: 'advance_directive', label: 'Advance Directive' },
  { value: 'funeral_instructions', label: 'Funeral Instructions' },
  { value: 'asset_inventory', label: 'Asset Inventory' },
  { value: 'beneficiary_designation', label: 'Beneficiary Designation' },
  { value: 'guardianship_designation', label: 'Guardianship Designation' },
  { value: 'digital_asset_directive', label: 'Digital Asset Directive' },
  { value: 'letter_of_instruction', label: 'Letter of Instruction' }
]

const documentStatuses = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'pending_review', label: 'Pending Review', color: 'yellow' },
  { value: 'reviewed', label: 'Reviewed', color: 'blue' },
  { value: 'executed', label: 'Executed', color: 'green' },
  { value: 'notarized', label: 'Notarized', color: 'purple' },
  { value: 'filed', label: 'Filed', color: 'indigo' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'superseded', label: 'Superseded', color: 'orange' },
  { value: 'revoked', label: 'Revoked', color: 'red' },
  { value: 'expired', label: 'Expired', color: 'red' }
]

export function LegalDocumentManager() {
  const [documents, setDocuments] = useState<LegalDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [selectedTab, setSelectedTab] = useState('all')
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    jurisdiction: ''
  })

  // New document form
  const [newDocument, setNewDocument] = useState({
    type: '',
    title: '',
    description: '',
    jurisdiction: {
      country: 'US',
      state: ''
    }
  })

  // Template form
  const [templateData, setTemplateData] = useState<Record<string, any>>({})
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [templates, setTemplates] = useState<any[]>([])

  useEffect(() => {
    loadDocuments()
  }, [filter])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter.type) params.append('type', filter.type)
      if (filter.status) params.append('status', filter.status)
      if (filter.jurisdiction) params.append('jurisdiction', filter.jurisdiction)

      const response = await fetch(`/api/legal/documents?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const createDocument = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/legal/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument)
      })

      if (response.ok) {
        await loadDocuments()
        setShowCreateDialog(false)
        setNewDocument({
          type: '',
          title: '',
          description: '',
          jurisdiction: { country: 'US', state: '' }
        })
      }
    } catch (error) {
      console.error('Failed to create document:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch(
        `/api/legal/templates?type=${newDocument.type}&country=${newDocument.jurisdiction.country}&state=${newDocument.jurisdiction.state}`
      )
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const generateFromTemplate = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/legal/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          data: {
            ...templateData,
            title: newDocument.title || `New ${newDocument.type.replace(/_/g, ' ')}`
          }
        })
      })

      if (response.ok) {
        await loadDocuments()
        setShowTemplateDialog(false)
        setTemplateData({})
        setSelectedTemplate('')
      }
    } catch (error) {
      console.error('Failed to generate from template:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = documentStatuses.find(s => s.value === status)
    if (!statusInfo) return null

    const colorClasses = {
      gray: 'bg-gray-100 text-gray-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800'
    }

    return (
      <Badge className={colorClasses[statusInfo.color as keyof typeof colorClasses]}>
        {statusInfo.label}
      </Badge>
    )
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'will':
      case 'living_will':
        return <FileText className="h-5 w-5" />
      case 'power_of_attorney':
        return <Gavel className="h-5 w-5" />
      case 'healthcare_proxy':
      case 'advance_directive':
        return <Shield className="h-5 w-5" />
      case 'trust':
        return <BookOpen className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }
  const renderDocumentCard = (doc: LegalDocument) => {
    const isComplete = doc.status === 'executed' || doc.status === 'notarized' || doc.status === 'filed'
    const needsAttention = doc.status === 'draft' || doc.status === 'pending_review'

    return (
      <Card
        key={doc.id}
        className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
          selectedDocument?.id === doc.id ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => setSelectedDocument(doc)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              isComplete ? 'bg-green-50' : needsAttention ? 'bg-yellow-50' : 'bg-gray-50'
            }`}>
              {getDocumentIcon(doc.type)}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm flex items-center gap-2">
                {doc.title}
                {doc.courtAdmissible && (
                  <Badge variant="outline" className="text-xs">
                    <Gavel className="h-3 w-3 mr-1" />
                    Court Admissible
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Updated {new Date(doc.updatedAt).toLocaleDateString()}
                </span>
                <span>{doc.jurisdiction.country} {doc.jurisdiction.state && `- ${doc.jurisdiction.state}`}</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                {doc.signatures.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <PenTool className="h-3 w-3" />
                    {doc.signatures.length} Signature{doc.signatures.length !== 1 ? 's' : ''}
                  </span>
                )}
                {doc.witnesses.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-blue-600">
                    <Users className="h-3 w-3" />
                    {doc.witnesses.length} Witness{doc.witnesses.length !== 1 ? 'es' : ''}
                  </span>
                )}
                {doc.notarization && (
                  <span className="flex items-center gap-1 text-xs text-purple-600">
                    <FileCheck className="h-3 w-3" />
                    Notarized
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(doc.status)}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation()
                // Handle edit
              }}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation()
                // Handle share
              }}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const renderCreateDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Legal Document</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Document Type</Label>
            <Select
              value={newDocument.type}
              onValueChange={(value) => {
                setNewDocument({ ...newDocument, type: value })
                if (value) loadTemplates()
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={newDocument.title}
              onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
              placeholder="Enter document title"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={newDocument.description}
              onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
              placeholder="Brief description of the document"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <Select
                value={newDocument.jurisdiction.country}
                onValueChange={(value) => setNewDocument({
                  ...newDocument,
                  jurisdiction: { ...newDocument.jurisdiction, country: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newDocument.jurisdiction.country === 'US' && (
              <div>
                <Label>State</Label>
                <Input
                  value={newDocument.jurisdiction.state || ''}
                  onChange={(e) => setNewDocument({
                    ...newDocument,
                    jurisdiction: { ...newDocument.jurisdiction, state: e.target.value }
                  })}
                  placeholder="e.g., CA, NY, TX"
                  maxLength={2}
                />
              </div>
            )}
          </div>

          {templates.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {templates.length} template{templates.length !== 1 ? 's' : ''} available for this document type.
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setShowCreateDialog(false)
                    setShowTemplateDialog(true)
                  }}
                  className="ml-2"
                >
                  Use Template
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
            Cancel
          </Button>
          <Button onClick={createDocument} disabled={!newDocument.type || !newDocument.title}>
            Create Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const renderTemplateDialog = () => (
    <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Generate from Template</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            <div>
              <Label>Select Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="space-y-4 mt-6">
                <h4 className="font-medium">Template Fields</h4>
                {templates
                  .find(t => t.id === selectedTemplate)
                  ?.fields.map((field: any) => (
                    <div key={field.id}>
                      <Label>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {field.type === 'text' && (
                        <Input
                          value={templateData[field.name] || ''}
                          onChange={(e) => setTemplateData({
                            ...templateData,
                            [field.name]: e.target.value
                          })}
                          placeholder={field.placeholder}
                        />
                      )}
                      {field.type === 'date' && (
                        <Input
                          type="date"
                          value={templateData[field.name] || ''}
                          onChange={(e) => setTemplateData({
                            ...templateData,
                            [field.name]: e.target.value
                          })}
                        />
                      )}
                      {field.type === 'select' && (
                        <Select
                          value={templateData[field.name] || ''}
                          onValueChange={(value) => setTemplateData({
                            ...templateData,
                            [field.name]: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={field.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.validation?.options?.map((option: any) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.helpText && (
                        <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
            Cancel
          </Button>
          <Button onClick={generateFromTemplate} disabled={!selectedTemplate}>
            Generate Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (loading && documents.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading legal documents...</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gavel className="h-6 w-6" />
          Legal Documents
        </h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Document
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs">Document Type</Label>
            <Select
              value={filter.type}
              onValueChange={(value) => setFilter({ ...filter, type: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Status</Label>
            <Select
              value={filter.status}
              onValueChange={(value) => setFilter({ ...filter, status: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {documentStatuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Jurisdiction</Label>
            <Input
              value={filter.jurisdiction}
              onChange={(e) => setFilter({ ...filter, jurisdiction: e.target.value })}
              placeholder="e.g., US, CA"
              className="h-9"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter({ type: '', status: '', jurisdiction: '' })}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Document Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {documents.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Legal Documents</h3>
              <p className="text-gray-500 mb-4">
                Create your first legal document to get started
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Document
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => renderDocumentCard(doc))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="space-y-3">
            {documents
              .filter(doc => ['active', 'executed', 'notarized', 'filed'].includes(doc.status))
              .map(doc => renderDocumentCard(doc))}
          </div>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <div className="space-y-3">
            {documents
              .filter(doc => ['draft', 'pending_review', 'reviewed'].includes(doc.status))
              .map(doc => renderDocumentCard(doc))}
          </div>
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <div className="space-y-3">
            {documents
              .filter(doc => ['superseded', 'revoked', 'expired'].includes(doc.status))
              .map(doc => renderDocumentCard(doc))}
          </div>
        </TabsContent>
      </Tabs>

      {renderCreateDialog()}
      {renderTemplateDialog()}
    </div>
  )
}