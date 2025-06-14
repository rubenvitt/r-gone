'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Plus,
  Search,
  Filter,
  Users,
  User,
  Mail,
  Phone,
  Shield,
  Edit,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  CheckCircle,
  Globe,
  MessageSquare,
  FileText,
  UserPlus,
  Import,
  Export,
  Copy
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  MessageRecipient,
  RecipientType,
  DeliveryMethod,
  MessagePermissions
} from '@/types/data'

interface RecipientManagerProps {
  recipients: MessageRecipient[]
  beneficiaries?: any[]
  contacts?: any[]
  onRecipientsChange: (recipients: MessageRecipient[]) => void
  mode?: 'inline' | 'modal'
  onClose?: () => void
}

type ViewMode = 'grid' | 'list'

export default function RecipientManager({
  recipients,
  beneficiaries = [],
  contacts = [],
  onRecipientsChange,
  mode = 'inline',
  onClose
}: RecipientManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<RecipientType | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editingRecipient, setEditingRecipient] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  
  // New recipient form state
  const [newRecipient, setNewRecipient] = useState<Partial<MessageRecipient>>({
    type: 'email',
    name: '',
    identifier: '',
    deliveryMethod: ['system'],
    permissions: {
      canView: true,
      canDownload: true,
      canForward: false,
      canReply: true,
      canPrint: true
    },
    priority: recipients.length + 1
  })

  // Filter recipients
  const filteredRecipients = useMemo(() => {
    let filtered = recipients

    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.type === selectedType)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(search) ||
        r.identifier.toLowerCase().includes(search) ||
        r.relationship?.toLowerCase().includes(search)
      )
    }

    return filtered.sort((a, b) => a.priority - b.priority)
  }, [recipients, selectedType, searchTerm])

  // Add recipient
  const handleAddRecipient = useCallback(() => {
    if (!newRecipient.name || !newRecipient.identifier) {
      return
    }

    const recipient: MessageRecipient = {
      id: crypto.randomUUID(),
      type: newRecipient.type!,
      name: newRecipient.name,
      identifier: newRecipient.identifier,
      relationship: newRecipient.relationship,
      priority: recipients.length + 1,
      deliveryMethod: newRecipient.deliveryMethod!,
      permissions: newRecipient.permissions!,
      acknowledgmentRequired: newRecipient.acknowledgmentRequired
    }

    onRecipientsChange([...recipients, recipient])
    setNewRecipient({
      type: 'email',
      name: '',
      identifier: '',
      deliveryMethod: ['system'],
      permissions: {
        canView: true,
        canDownload: true,
        canForward: false,
        canReply: true,
        canPrint: true
      },
      priority: recipients.length + 2
    })
    setShowAddForm(false)
  }, [newRecipient, recipients, onRecipientsChange])

  // Update recipient
  const handleUpdateRecipient = useCallback((id: string, updates: Partial<MessageRecipient>) => {
    const updatedRecipients = recipients.map(r =>
      r.id === id ? { ...r, ...updates } : r
    )
    onRecipientsChange(updatedRecipients)
  }, [recipients, onRecipientsChange])

  // Delete recipient
  const handleDeleteRecipient = useCallback((id: string) => {
    const updatedRecipients = recipients.filter(r => r.id !== id)
    // Update priorities
    updatedRecipients.forEach((r, index) => {
      r.priority = index + 1
    })
    onRecipientsChange(updatedRecipients)
  }, [recipients, onRecipientsChange])

  // Import from beneficiaries/contacts
  const handleImportFromList = useCallback((source: 'beneficiaries' | 'contacts') => {
    const sourceList = source === 'beneficiaries' ? beneficiaries : contacts
    const existingIds = new Set(recipients.map(r => r.identifier))
    
    const newRecipients = sourceList
      .filter(item => !existingIds.has(item.email || item.id))
      .map((item, index) => ({
        id: crypto.randomUUID(),
        type: source === 'beneficiaries' ? 'beneficiary' : 'contact' as RecipientType,
        name: item.name || `${item.firstName} ${item.lastName}`,
        identifier: item.email || item.id,
        relationship: item.relationship || item.type,
        priority: recipients.length + index + 1,
        deliveryMethod: ['email'] as DeliveryMethod[],
        permissions: {
          canView: true,
          canDownload: true,
          canForward: false,
          canReply: true,
          canPrint: true
        }
      }))

    onRecipientsChange([...recipients, ...newRecipients])
  }, [beneficiaries, contacts, recipients, onRecipientsChange])

  // Get delivery method icon
  const getDeliveryMethodIcon = (method: DeliveryMethod) => {
    switch (method) {
      case 'system': return Globe
      case 'email': return Mail
      case 'sms': return Phone
      case 'webhook': return Globe
      case 'print': return FileText
    }
  }

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold">Message Recipients</h3>
          <span className="text-sm text-gray-500">({recipients.length} total)</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {beneficiaries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleImportFromList('beneficiaries')}
            >
              <Import className="h-4 w-4 mr-1" />
              From Beneficiaries
            </Button>
          )}
          {contacts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleImportFromList('contacts')}
            >
              <Import className="h-4 w-4 mr-1" />
              From Contacts
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Recipient
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search recipients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as RecipientType | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="email">Email</option>
          <option value="beneficiary">Beneficiary</option>
          <option value="contact">Contact</option>
          <option value="executor">Executor</option>
          <option value="lawyer">Lawyer</option>
        </select>
      </div>

      {/* Add Recipient Form */}
      {showAddForm && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-3">Add New Recipient</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={newRecipient.name || ''}
                onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Recipient name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email/ID *
              </label>
              <input
                type="text"
                value={newRecipient.identifier || ''}
                onChange={(e) => setNewRecipient({ ...newRecipient, identifier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email or identifier"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={newRecipient.type}
                onChange={(e) => setNewRecipient({ ...newRecipient, type: e.target.value as RecipientType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="email">Email</option>
                <option value="beneficiary">Beneficiary</option>
                <option value="contact">Contact</option>
                <option value="executor">Executor</option>
                <option value="lawyer">Lawyer</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship
              </label>
              <input
                type="text"
                value={newRecipient.relationship || ''}
                onChange={(e) => setNewRecipient({ ...newRecipient, relationship: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Spouse, Child, Friend"
              />
            </div>
          </div>
          
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Methods
            </label>
            <div className="flex flex-wrap gap-2">
              {(['system', 'email', 'sms'] as DeliveryMethod[]).map(method => {
                const Icon = getDeliveryMethodIcon(method)
                const isSelected = newRecipient.deliveryMethod?.includes(method)
                return (
                  <button
                    key={method}
                    onClick={() => {
                      const methods = newRecipient.deliveryMethod || []
                      if (isSelected) {
                        setNewRecipient({
                          ...newRecipient,
                          deliveryMethod: methods.filter(m => m !== method)
                        })
                      } else {
                        setNewRecipient({
                          ...newRecipient,
                          deliveryMethod: [...methods, method]
                        })
                      }
                    }}
                    className={`inline-flex items-center px-3 py-1 rounded-lg text-sm ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {method}
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="mt-3 flex items-center">
            <input
              type="checkbox"
              id="acknowledgmentRequired"
              checked={newRecipient.acknowledgmentRequired || false}
              onChange={(e) => setNewRecipient({ ...newRecipient, acknowledgmentRequired: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="acknowledgmentRequired" className="ml-2 text-sm text-gray-700">
              Require acknowledgment
            </label>
          </div>
          
          <div className="mt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                setNewRecipient({
                  type: 'email',
                  name: '',
                  identifier: '',
                  deliveryMethod: ['system'],
                  permissions: {
                    canView: true,
                    canDownload: true,
                    canForward: false,
                    canReply: true,
                    canPrint: true
                  },
                  priority: recipients.length + 1
                })
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleAddRecipient}
              disabled={!newRecipient.name || !newRecipient.identifier}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Recipient
            </Button>
          </div>
        </div>
      )}

      {/* Recipients List */}
      {filteredRecipients.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600 mb-2">No recipients found</p>
          <p className="text-sm text-gray-500">
            {searchTerm || selectedType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Add recipients to send your message'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecipients.map((recipient, index) => (
            <RecipientCard
              key={recipient.id}
              recipient={recipient}
              isEditing={editingRecipient === recipient.id}
              onEdit={() => setEditingRecipient(recipient.id)}
              onSave={(updates) => {
                handleUpdateRecipient(recipient.id, updates)
                setEditingRecipient(null)
              }}
              onCancel={() => setEditingRecipient(null)}
              onDelete={() => handleDeleteRecipient(recipient.id)}
              getDeliveryMethodIcon={getDeliveryMethodIcon}
            />
          ))}
        </div>
      )}
    </div>
  )

  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold">Manage Recipients</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {content}
          </div>
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-end">
              <Button onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return content
}

// Recipient Card Component
interface RecipientCardProps {
  recipient: MessageRecipient
  isEditing: boolean
  onEdit: () => void
  onSave: (updates: Partial<MessageRecipient>) => void
  onCancel: () => void
  onDelete: () => void
  getDeliveryMethodIcon: (method: DeliveryMethod) => any
}

function RecipientCard({
  recipient,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  getDeliveryMethodIcon
}: RecipientCardProps) {
  const [editData, setEditData] = useState(recipient)

  if (isEditing) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Name"
          />
          <input
            type="text"
            value={editData.identifier}
            onChange={(e) => setEditData({ ...editData, identifier: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email/ID"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onSave(editData)}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <h4 className="font-medium">{recipient.name}</h4>
              <p className="text-sm text-gray-500">
                {recipient.identifier} • {recipient.type}
                {recipient.relationship && ` • ${recipient.relationship}`}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500 mr-2">Delivery:</span>
              <div className="inline-flex items-center space-x-2">
                {recipient.deliveryMethod.map(method => {
                  const Icon = getDeliveryMethodIcon(method)
                  return (
                    <span key={method} className="inline-flex items-center">
                      <Icon className="h-4 w-4 text-gray-400" />
                    </span>
                  )
                })}
              </div>
            </div>
            
            <div>
              <span className="text-gray-500 mr-2">Priority:</span>
              <span className="font-medium">{recipient.priority}</span>
            </div>
            
            {recipient.acknowledgmentRequired && (
              <div className="flex items-center text-yellow-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Acknowledgment required</span>
              </div>
            )}
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(recipient.permissions).map(([key, value]) => {
              if (typeof value === 'boolean' && value) {
                return (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {key.replace('can', 'Can ')}
                  </span>
                )
              }
              return null
            })}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}