'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  Edit2, 
  Trash2,
  CheckCircle,
  Key,
  Eye,
  Download,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmergencyContact, ContactGroup } from '@/services/emergency-access-service'

interface EmergencyContactsProps {
  className?: string
  onGenerateToken?: (contactId: string) => void
}

export default function EmergencyContacts({ 
  className = '',
  onGenerateToken 
}: EmergencyContactsProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddContact, setShowAddContact] = useState(false)
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: '',
    defaultAccessLevel: 'view' as 'view' | 'download' | 'full',
    notes: ''
  })

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/emergency/contacts')
      const result = await response.json()

      if (result.success) {
        setContacts(result.contacts)
      } else {
        setError(result.error || 'Failed to load contacts')
      }
    } catch (error) {
      setError('Failed to load emergency contacts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const url = editingContact 
        ? `/api/emergency/contacts/${editingContact.id}`
        : '/api/emergency/contacts'
      
      const method = editingContact ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        await loadContacts()
        setShowAddContact(false)
        setEditingContact(null)
        resetForm()
      } else {
        setError(result.error || 'Failed to save contact')
      }
    } catch (error) {
      setError('Failed to save contact')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/emergency/contacts/${contactId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        await loadContacts()
      } else {
        setError(result.error || 'Failed to delete contact')
      }
    } catch (error) {
      setError('Failed to delete contact')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (contact: EmergencyContact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      relationship: contact.relationship,
      defaultAccessLevel: contact.defaultAccessLevel,
      notes: contact.notes || ''
    })
    setShowAddContact(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      relationship: '',
      defaultAccessLevel: 'view',
      notes: ''
    })
  }

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'view':
        return <Eye className="h-4 w-4" />
      case 'download':
        return <Download className="h-4 w-4" />
      case 'full':
        return <Lock className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'view':
        return 'text-blue-600 bg-blue-50'
      case 'download':
        return 'text-green-600 bg-green-50'
      case 'full':
        return 'text-purple-600 bg-purple-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Emergency Contacts</h2>
              <p className="text-gray-600">Manage trusted contacts who can access your information</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setShowAddContact(true)
              setEditingContact(null)
              resetForm()
            }}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Contact</span>
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Contact Form */}
      {showAddContact && (
        <div className="p-6 border-b bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">
            {editingContact ? 'Edit Contact' : 'Add New Contact'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship *
                </label>
                <input
                  type="text"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Spouse, Child, Attorney, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Access Level
                </label>
                <select
                  value={formData.defaultAccessLevel}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    defaultAccessLevel: e.target.value as 'view' | 'download' | 'full' 
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="view">View Only</option>
                  <option value="download">View & Download</option>
                  <option value="full">Full Access</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional information"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddContact(false)
                  setEditingContact(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {editingContact ? 'Update Contact' : 'Add Contact'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Contacts List */}
      <div className="p-6">
        {isLoading && contacts.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No emergency contacts added yet</p>
            <Button
              variant="outline"
              onClick={() => setShowAddContact(true)}
            >
              Add Your First Contact
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-lg">{contact.name}</h4>
                      {contact.verifiedAt && (
                        <CheckCircle className="h-5 w-5 text-green-600" title="Verified" />
                      )}
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getAccessLevelColor(contact.defaultAccessLevel)}`}>
                        {getAccessLevelIcon(contact.defaultAccessLevel)}
                        <span className="capitalize">{contact.defaultAccessLevel}</span>
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{contact.email}</span>
                      </div>
                      {contact.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>{contact.relationship}</span>
                      </div>
                      {contact.notes && (
                        <div className="text-gray-500 italic">{contact.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onGenerateToken?.(contact.id)}
                      title="Generate access token"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                      title="Edit contact"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}