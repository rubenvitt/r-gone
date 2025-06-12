'use client'

import { useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { 
  UserPlus, 
  Search, 
  Grid, 
  List, 
  Star, 
  StarOff,
  Users,
  Phone,
  Mail,
  Edit,
  Trash2,
  Heart,
  AlertTriangle,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  ContactEntry, 
  ContactDirectory as ContactDirectoryType, 
  ContactCategory, 
  ContactRelationship,
  ContactFilter,
  ContactMethod,
  ContactAddress,
  ImportantDate,
  ContactMethodType,
  AddressType,
  DateType,
  TrustLevel
} from '@/types/data'
import { contactDirectoryService } from '@/services/contact-directory-service'
import ContactDetailView from './ContactDetailView'

interface ContactDirectoryProps {
  directory: ContactDirectoryType
  onDirectoryChange: (directory: ContactDirectoryType) => void
  className?: string
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'category' | 'relationship' | 'lastContacted' | 'created'

export default function ContactDirectory({ 
  directory, 
  onDirectoryChange, 
  className = '' 
}: ContactDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<ContactFilter>({})
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [viewingContact, setViewingContact] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let contacts = directory.contacts

    // Apply search
    if (searchTerm) {
      const searchResults = contactDirectoryService.searchContacts(directory, searchTerm)
      contacts = searchResults.map(result => result.contact)
    }

    // Apply filters
    contacts = contactDirectoryService.filterContacts(directory, filter)

    // Sort contacts
    contacts.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.displayName || `${a.firstName} ${a.lastName}`).localeCompare(
            b.displayName || `${b.firstName} ${b.lastName}`
          )
        case 'category':
          return a.category.localeCompare(b.category)
        case 'relationship':
          return a.relationship.localeCompare(b.relationship)
        case 'lastContacted':
          const aDate = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0
          const bDate = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0
          return bDate - aDate
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

    return contacts
  }, [directory, searchTerm, filter, sortBy])

  // Toggle favorite
  const toggleFavorite = useCallback((contactId: string) => {
    const contact = directory.contacts.find(c => c.id === contactId)
    if (contact) {
      const updatedDirectory = contactDirectoryService.updateContact(directory, contactId, {
        isFavorite: !contact.isFavorite
      })
      onDirectoryChange(updatedDirectory)
    }
  }, [directory, onDirectoryChange])


  // Mark as contacted
  const markAsContacted = useCallback((contactId: string) => {
    const updatedDirectory = contactDirectoryService.markAsContacted(directory, contactId)
    onDirectoryChange(updatedDirectory)
  }, [directory, onDirectoryChange])

  // Delete contact
  const handleDeleteContact = useCallback((contactId: string) => {
    const contact = directory.contacts.find(c => c.id === contactId)
    if (contact && confirm(`Are you sure you want to delete ${contact.displayName || `${contact.firstName} ${contact.lastName}`}?`)) {
      const updatedDirectory = contactDirectoryService.deleteContact(directory, contactId)
      onDirectoryChange(updatedDirectory)
      setSelectedContact(null)
    }
  }, [directory, onDirectoryChange])

  // Get relationship icon
  const getRelationshipIcon = useCallback((relationship: ContactRelationship) => {
    const iconMap = {
      family: '👨‍👩‍👧‍👦',
      spouse: '💑',
      partner: '👫',
      child: '👶',
      parent: '👨‍👩‍👧‍👦',
      sibling: '👫',
      grandparent: '👴',
      grandchild: '👶',
      friend: '👯',
      colleague: '👥',
      business: '💼',
      professional: '👔',
      medical: '👩‍⚕️',
      legal: '⚖️',
      financial: '💰',
      neighbor: '🏠',
      acquaintance: '🤝',
      other: '👤'
    }
    return iconMap[relationship] || '👤'
  }, [])

  // Get trust level color
  const getTrustLevelColor = useCallback((trustLevel: TrustLevel) => {
    switch (trustLevel) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }, [])

  // Get primary contact method
  const getPrimaryContactMethod = useCallback((contact: ContactEntry) => {
    const primary = contact.contactMethods.find(m => m.isPrimary)
    if (primary) return primary

    // Fallback to first phone, then email
    const phone = contact.contactMethods.find(m => ['phone', 'mobile'].includes(m.type))
    if (phone) return phone

    const email = contact.contactMethods.find(m => m.type === 'email')
    if (email) return email

    return contact.contactMethods[0]
  }, [])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Contact Directory</h2>
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
              onClick={() => setShowAddForm(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{directory.statistics.totalContacts}</div>
            <div className="text-sm text-blue-800">Total Contacts</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{directory.statistics.favoriteContacts}</div>
            <div className="text-sm text-yellow-800">Favorites</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{directory.statistics.emergencyContacts}</div>
            <div className="text-sm text-red-800">Emergency</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{directory.statistics.recentlyAdded}</div>
            <div className="text-sm text-green-800">Recent</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{directory.groups.length}</div>
            <div className="text-sm text-purple-800">Groups</div>
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
              placeholder="Search contacts..."
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
              category: e.target.value === 'all' ? undefined : e.target.value as ContactCategory 
            }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {directory.categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          {/* Relationship Filter */}
          <select
            value={filter.relationship || 'all'}
            onChange={(e) => setFilter(prev => ({ 
              ...prev, 
              relationship: e.target.value === 'all' ? undefined : e.target.value as ContactRelationship 
            }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Relationships</option>
            {directory.relationships.map(relationship => (
              <option key={relationship} value={relationship}>
                {getRelationshipIcon(relationship)} {relationship.charAt(0).toUpperCase() + relationship.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="category">Sort by Category</option>
            <option value="relationship">Sort by Relationship</option>
            <option value="lastContacted">Sort by Last Contact</option>
            <option value="created">Sort by Created</option>
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

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={filter.isFavorite ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(prev => ({ 
              ...prev, 
              isFavorite: prev.isFavorite ? undefined : true 
            }))}
          >
            <Star className="h-4 w-4 mr-1" />
            Favorites
          </Button>
          <Button
            variant={filter.isEmergencyContact ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(prev => ({ 
              ...prev, 
              isEmergencyContact: prev.isEmergencyContact ? undefined : true 
            }))}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Emergency
          </Button>
          <Button
            variant={filter.hasPhoto ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(prev => ({ 
              ...prev, 
              hasPhoto: prev.hasPhoto ? undefined : true 
            }))}
          >
            📷 With Photo
          </Button>
        </div>
      </div>

      {/* Contact Grid/List */}
      <div className="bg-white rounded-lg shadow-sm border min-h-[400px]">
        {filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No contacts found</p>
            <p>
              {searchTerm || filter.category || filter.relationship 
                ? 'Try adjusting your search or filters.' 
                : 'Add your first contact to get started.'
              }
            </p>
            {!searchTerm && !filter.category && !filter.relationship && (
              <Button
                onClick={() => setShowAddForm(true)}
                className="mt-4"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Contact
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onToggleFavorite={() => toggleFavorite(contact.id)}
                onMarkContacted={() => markAsContacted(contact.id)}
                onView={() => setViewingContact(contact.id)}
                onEdit={() => setSelectedContact(contact.id)}
                onDelete={() => handleDeleteContact(contact.id)}
                getRelationshipIcon={getRelationshipIcon}
                getTrustLevelColor={getTrustLevelColor}
                getPrimaryContactMethod={getPrimaryContactMethod}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredContacts.map((contact) => (
              <ContactListItem
                key={contact.id}
                contact={contact}
                onToggleFavorite={() => toggleFavorite(contact.id)}
                onMarkContacted={() => markAsContacted(contact.id)}
                onView={() => setViewingContact(contact.id)}
                onEdit={() => setSelectedContact(contact.id)}
                onDelete={() => handleDeleteContact(contact.id)}
                getRelationshipIcon={getRelationshipIcon}
                getTrustLevelColor={getTrustLevelColor}
                getPrimaryContactMethod={getPrimaryContactMethod}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || selectedContact) && (
        <ContactForm
          contact={selectedContact ? directory.contacts.find(c => c.id === selectedContact) : undefined}
          directory={directory}
          onSave={(contactData) => {
            if (selectedContact) {
              const updatedDirectory = contactDirectoryService.updateContact(directory, selectedContact, contactData)
              onDirectoryChange(updatedDirectory)
            } else {
              const updatedDirectory = contactDirectoryService.addContact(directory, contactData)
              onDirectoryChange(updatedDirectory)
            }
            setShowAddForm(false)
            setSelectedContact(null)
          }}
          onCancel={() => {
            setShowAddForm(false)
            setSelectedContact(null)
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <ContactDirectorySettings
          directory={directory}
          onSave={(updatedDirectory) => {
            onDirectoryChange(updatedDirectory)
            setShowSettings(false)
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}

      {/* Contact Detail View Modal */}
      {viewingContact && (
        <ContactDetailView
          contact={directory.contacts.find(c => c.id === viewingContact)!}
          directory={directory}
          onClose={() => setViewingContact(null)}
          onEdit={() => {
            setSelectedContact(viewingContact)
            setViewingContact(null)
          }}
          onDelete={() => {
            handleDeleteContact(viewingContact)
            setViewingContact(null)
          }}
        />
      )}
    </div>
  )
}

// Contact Card Component for Grid View
interface ContactCardProps {
  contact: ContactEntry
  onToggleFavorite: () => void
  onMarkContacted: () => void
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  getRelationshipIcon: (relationship: ContactRelationship) => string
  getTrustLevelColor: (trustLevel: TrustLevel) => string
  getPrimaryContactMethod: (contact: ContactEntry) => ContactMethod | undefined
}

function ContactCard({
  contact,
  onToggleFavorite,
  onMarkContacted,
  onView,
  onEdit,
  onDelete,
  getRelationshipIcon,
  getTrustLevelColor,
  getPrimaryContactMethod
}: ContactCardProps) {
  const primaryMethod = getPrimaryContactMethod(contact)

  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {/* Photo or Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-2">
            {contact.photo ? (
              <Image 
                src={contact.photo} 
                alt={contact.displayName || ''}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            ) : (
              <span className="text-xl">{getRelationshipIcon(contact.relationship)}</span>
            )}
          </div>

          <h3 className="font-medium text-sm truncate" title={contact.displayName}>
            {contact.displayName || `${contact.firstName} ${contact.lastName}`}
          </h3>
          
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>{contact.category}</span>
            <span className={getTrustLevelColor(contact.trustLevel)}>●</span>
          </div>
        </div>

        <div className="flex flex-col space-y-1">
          {contact.isFavorite && (
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          )}
          {contact.isEmergencyContact && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Primary Contact Method */}
      {primaryMethod && (
        <div className="text-xs text-gray-600 mb-3 flex items-center">
          {primaryMethod.type === 'email' ? (
            <Mail className="h-3 w-3 mr-1" />
          ) : (
            <Phone className="h-3 w-3 mr-1" />
          )}
          <span className="truncate">{primaryMethod.value}</span>
        </div>
      )}

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {contact.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
            >
              {tag}
            </span>
          ))}
          {contact.tags.length > 2 && (
            <span className="text-xs text-gray-500">+{contact.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-1">
          <Button variant="ghost" size="sm" onClick={onToggleFavorite}>
            {contact.isFavorite ? (
              <StarOff className="h-3 w-3" />
            ) : (
              <Star className="h-3 w-3" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onMarkContacted}>
            <Heart className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex space-x-1">
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

// Contact List Item Component for List View  
type ContactListItemProps = ContactCardProps

function ContactListItem({
  contact,
  onToggleFavorite,
  onMarkContacted,
  onView,
  onEdit,
  onDelete,
  getRelationshipIcon,
  getTrustLevelColor,
  getPrimaryContactMethod
}: ContactListItemProps) {
  const primaryMethod = getPrimaryContactMethod(contact)

  return (
    <div 
      className="p-4 hover:bg-gray-50 flex items-center space-x-4 cursor-pointer"
      onClick={onView}>
      {/* Photo or Avatar */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          {contact.photo ? (
            <Image 
              src={contact.photo} 
              alt={contact.displayName || ''}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <span>{getRelationshipIcon(contact.relationship)}</span>
          )}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-gray-900 truncate">
            {contact.displayName || `${contact.firstName} ${contact.lastName}`}
          </h3>
          {contact.isFavorite && (
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          )}
          {contact.isEmergencyContact && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          <span className={`inline-block w-2 h-2 rounded-full ${getTrustLevelColor(contact.trustLevel).replace('text-', 'bg-')}`} />
        </div>
        
        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
          <span>{contact.category} • {contact.relationship}</span>
          {primaryMethod && (
            <span className="flex items-center">
              {primaryMethod.type === 'email' ? (
                <Mail className="h-3 w-3 mr-1" />
              ) : (
                <Phone className="h-3 w-3 mr-1" />
              )}
              {primaryMethod.value}
            </span>
          )}
          {contact.lastContactedAt && (
            <span>Last: {new Date(contact.lastContactedAt).toLocaleDateString()}</span>
          )}
        </div>
        
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {contact.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={onToggleFavorite}>
          {contact.isFavorite ? (
            <StarOff className="h-4 w-4" />
          ) : (
            <Star className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={onMarkContacted}>
          <Heart className="h-4 w-4" />
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

// Contact Form Component
interface ContactFormProps {
  contact?: ContactEntry;
  directory: ContactDirectory;
  onSave: (data: Partial<ContactEntry>) => void;
  onCancel: () => void;
}

function ContactForm({ contact, directory, onSave, onCancel }: ContactFormProps) {
  const [errors, setErrors] = useState<string[]>([])
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    displayName: string;
    nickname: string;
    relationship: ContactRelationship;
    category: ContactCategory;
    contactMethods: Omit<ContactMethod, 'id'>[];
    addresses: Omit<ContactAddress, 'id'>[];
    importantDates: Omit<ImportantDate, 'id'>[];
    notes: string;
    tags: string;
    trustLevel: TrustLevel;
    isEmergencyContact: boolean;
    emergencyPriority: string;
    isFavorite: boolean;
  }>({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    displayName: contact?.displayName || '',
    nickname: contact?.nickname || '',
    relationship: contact?.relationship || 'other',
    category: contact?.category || directory.settings.defaultCategory,
    contactMethods: contact?.contactMethods.map(({ id, ...method }) => method) || [{
      type: 'phone',
      value: '',
      label: 'Mobile',
      isPrimary: true
    }],
    addresses: contact?.addresses.map(({ id, ...address }) => address) || [],
    importantDates: contact?.importantDates.map(({ id, ...date }) => date) || [],
    notes: contact?.notes || '',
    tags: contact?.tags?.join(', ') || '',
    trustLevel: contact?.trustLevel || directory.settings.defaultTrustLevel,
    isEmergencyContact: contact?.isEmergencyContact || false,
    emergencyPriority: contact?.emergencyPriority?.toString() || '',
    isFavorite: contact?.isFavorite || false
  })

  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'additional'>('basic')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    
    // Validate using the service
    const validation = contactDirectoryService.validateContact({
      firstName: formData.firstName,
      lastName: formData.lastName,
      relationship: formData.relationship,
      category: formData.category,
      contactMethods: formData.contactMethods,
      addresses: formData.addresses,
      importantDates: formData.importantDates,
      notes: formData.notes,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      trustLevel: formData.trustLevel,
      isEmergencyContact: formData.isEmergencyContact,
      emergencyPriority: formData.emergencyPriority ? parseInt(formData.emergencyPriority) : undefined
    })

    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }
    
    const contactData: Partial<ContactEntry> = {
      ...formData,
      displayName: formData.displayName || `${formData.firstName} ${formData.lastName}`,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
    }

    onSave(contactData)
  }

  const addContactMethod = () => {
    setFormData(prev => ({
      ...prev,
      contactMethods: [...prev.contactMethods, { type: 'email', value: '', isPrimary: false }]
    }))
  }

  const removeContactMethod = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contactMethods: prev.contactMethods.filter((_, i) => i !== index)
    }))
  }

  const updateContactMethod = (index: number, updates: Partial<Omit<ContactMethod, 'id'>>) => {
    setFormData(prev => ({
      ...prev,
      contactMethods: prev.contactMethods.map((method, i) => 
        i === index ? { ...method, ...updates } : method
      )
    }))
  }

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, { 
        type: 'home', 
        street: '', 
        city: '', 
        country: '',
        isPrimary: prev.addresses.length === 0 
      }]
    }))
  }

  const removeAddress = (index: number) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index)
    }))
  }

  const updateAddress = (index: number, updates: Partial<Omit<ContactAddress, 'id'>>) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map((address, i) => 
        i === index ? { ...address, ...updates } : address
      )
    }))
  }

  const addImportantDate = () => {
    setFormData(prev => ({
      ...prev,
      importantDates: [...prev.importantDates, { 
        type: 'birthday', 
        date: '', 
        label: '',
        isRecurring: true 
      }]
    }))
  }

  const removeImportantDate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      importantDates: prev.importantDates.filter((_, i) => i !== index)
    }))
  }

  const updateImportantDate = (index: number, updates: Partial<Omit<ImportantDate, 'id'>>) => {
    setFormData(prev => ({
      ...prev,
      importantDates: prev.importantDates.map((date, i) => 
        i === index ? { ...date, ...updates } : date
      )
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {contact ? 'Edit Contact' : 'Add New Contact'}
        </h3>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 border-b">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'basic' 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Basic Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contact')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'contact' 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Contact Methods
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('additional')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'additional' 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Additional Info
            </button>
          </div>

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder={`${formData.firstName} ${formData.lastName}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nickname
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ContactCategory }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {directory.categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value as ContactRelationship }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {directory.relationships.map(relationship => (
                      <option key={relationship} value={relationship}>
                        {relationship.charAt(0).toUpperCase() + relationship.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trust Level
                </label>
                <select
                  value={formData.trustLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, trustLevel: e.target.value as TrustLevel }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isFavorite}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFavorite: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Mark as Favorite</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isEmergencyContact}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      isEmergencyContact: e.target.checked,
                      emergencyPriority: e.target.checked ? '5' : ''
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Emergency Contact</span>
                </label>
              </div>

              {/* Emergency Priority */}
              {formData.isEmergencyContact && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Priority (1 = Highest)
                  </label>
                  <select
                    value={formData.emergencyPriority}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyPriority: e.target.value }))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(priority => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Lower numbers indicate higher priority in emergency situations
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Contact Methods Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Contact Methods</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContactMethod}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Method
                </Button>
              </div>

              {formData.contactMethods.map((method, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <label className="block text-sm text-gray-600 mb-1">Type</label>
                    <select
                      value={method.type}
                      onChange={(e) => updateContactMethod(index, { type: e.target.value as ContactMethodType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="phone">Phone</option>
                      <option value="mobile">Mobile</option>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="telegram">Telegram</option>
                      <option value="signal">Signal</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-5">
                    <label className="block text-sm text-gray-600 mb-1">Value</label>
                    <input
                      type={method.type === 'email' ? 'email' : 'text'}
                      value={method.value}
                      onChange={(e) => updateContactMethod(index, { value: e.target.value })}
                      placeholder={method.type === 'email' ? 'email@example.com' : '+1 (555) 123-4567'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm text-gray-600 mb-1">Label</label>
                    <input
                      type="text"
                      value={method.label || ''}
                      onChange={(e) => updateContactMethod(index, { label: e.target.value })}
                      placeholder="Work, Personal..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContactMethod(index)}
                      disabled={formData.contactMethods.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Addresses</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAddress}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Address
                  </Button>
                </div>

                {formData.addresses.map((address, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg mb-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Type</label>
                        <select
                          value={address.type}
                          onChange={(e) => updateAddress(index, { type: e.target.value as AddressType })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="home">Home</option>
                          <option value="work">Work</option>
                          <option value="mailing">Mailing</option>
                          <option value="billing">Billing</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Label</label>
                        <input
                          type="text"
                          value={address.label || ''}
                          onChange={(e) => updateAddress(index, { label: e.target.value })}
                          placeholder="Optional label"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm text-gray-600 mb-1">Street</label>
                      <input
                        type="text"
                        value={address.street}
                        onChange={(e) => updateAddress(index, { street: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">City</label>
                        <input
                          type="text"
                          value={address.city}
                          onChange={(e) => updateAddress(index, { city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">State</label>
                        <input
                          type="text"
                          value={address.state || ''}
                          onChange={(e) => updateAddress(index, { state: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={address.postalCode || ''}
                          onChange={(e) => updateAddress(index, { postalCode: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <div className="col-span-3">
                        <label className="block text-sm text-gray-600 mb-1">Country</label>
                        <input
                          type="text"
                          value={address.country}
                          onChange={(e) => updateAddress(index, { country: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAddress(index)}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info Tab */}
          {activeTab === 'additional' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional notes about this contact..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="colleague, tennis, book club"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Important Dates</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addImportantDate}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Date
                  </Button>
                </div>

                {formData.importantDates.map((date, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end mb-2">
                    <div className="col-span-3">
                      <label className="block text-sm text-gray-600 mb-1">Type</label>
                      <select
                        value={date.type}
                        onChange={(e) => updateImportantDate(index, { type: e.target.value as DateType })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="birthday">Birthday</option>
                        <option value="anniversary">Anniversary</option>
                        <option value="memorial">Memorial</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm text-gray-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={date.date}
                        onChange={(e) => updateImportantDate(index, { date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm text-gray-600 mb-1">Label</label>
                      <input
                        type="text"
                        value={date.label || ''}
                        onChange={(e) => updateImportantDate(index, { label: e.target.value })}
                        placeholder="Description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={date.isRecurring}
                          onChange={(e) => updateImportantDate(index, { isRecurring: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">Recurring</span>
                      </label>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImportantDate(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {contact ? 'Update Contact' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ContactDirectorySettingsProps {
  directory: ContactDirectoryType;
  onSave: (directory: ContactDirectoryType) => void;
  onCancel: () => void;
}

function ContactDirectorySettings({ directory, onSave, onCancel }: ContactDirectorySettingsProps) {
  const [settings, setSettings] = useState({
    ...directory.settings
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const updatedDirectory: ContactDirectoryType = {
      ...directory,
      settings
    }
    
    onSave(updatedDirectory)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Directory Settings</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Default Settings */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Default Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Category
                </label>
                <select
                  value={settings.defaultCategory}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultCategory: e.target.value as ContactCategory }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {directory.categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Trust Level
                </label>
                <select
                  value={settings.defaultTrustLevel}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultTrustLevel: e.target.value as TrustLevel }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Features</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.enableGeolocation}
                  onChange={(e) => setSettings(prev => ({ ...prev, enableGeolocation: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Enable Geolocation</span>
                  <p className="text-xs text-gray-500">Store and display location information for contacts</p>
                </div>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.enableSocialSync}
                  onChange={(e) => setSettings(prev => ({ ...prev, enableSocialSync: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Enable Social Sync</span>
                  <p className="text-xs text-gray-500">Sync contact information from social media profiles</p>
                </div>
              </label>
            </div>
          </div>

          {/* Duplicate Detection */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Duplicate Detection</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.duplicateDetection.enabled}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    duplicateDetection: { ...prev.duplicateDetection, enabled: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable Duplicate Detection</span>
              </label>
              
              {settings.duplicateDetection.enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Similarity Threshold
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.1"
                      value={settings.duplicateDetection.threshold}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        duplicateDetection: { ...prev.duplicateDetection, threshold: parseFloat(e.target.value) }
                      }))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {(settings.duplicateDetection.threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Higher values require more similarity to detect duplicates
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Settings */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Privacy</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.privacy.shareContacts}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    privacy: { ...prev.privacy, shareContacts: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Share Contacts</span>
                  <p className="text-xs text-gray-500">Allow beneficiaries to access contact information</p>
                </div>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.privacy.allowExport}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    privacy: { ...prev.privacy, allowExport: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Allow Export</span>
                  <p className="text-xs text-gray-500">Enable exporting contacts to vCard or CSV format</p>
                </div>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.privacy.encryptPhotos}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    privacy: { ...prev.privacy, encryptPhotos: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Encrypt Photos</span>
                  <p className="text-xs text-gray-500">Store contact photos with additional encryption</p>
                </div>
              </label>
            </div>
          </div>

          {/* Reminders */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Reminders</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.reminders.enabled}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    reminders: { ...prev.reminders, enabled: e.target.checked }
                  }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable Reminders</span>
              </label>
              
              {settings.reminders.enabled && (
                <div className="grid grid-cols-2 gap-4 pl-7">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Birthday Reminder
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={settings.reminders.birthdayReminder}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          reminders: { ...prev.reminders, birthdayReminder: parseInt(e.target.value) || 0 }
                        }))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">days before</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anniversary Reminder
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={settings.reminders.anniversaryReminder}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          reminders: { ...prev.reminders, anniversaryReminder: parseInt(e.target.value) || 0 }
                        }))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">days before</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}