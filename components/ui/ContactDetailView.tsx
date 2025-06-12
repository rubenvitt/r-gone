'use client'

import { useState } from 'react'
import { 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Star,
  AlertTriangle,
  Edit,
  Trash2,
  X,
  Users,
  Link2,
  Share2,
  Shield,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  ContactEntry, 
  ContactDirectory as ContactDirectoryType,
  ContactMethod,
  ContactAddress,
  ImportantDate
} from '@/types/data'
import { contactDirectoryService } from '@/services/contact-directory-service'

interface ContactDetailViewProps {
  contact: ContactEntry
  directory: ContactDirectoryType
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onShare?: () => void
}

export default function ContactDetailView({ 
  contact, 
  directory, 
  onClose, 
  onEdit, 
  onDelete,
  onShare 
}: ContactDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'relationships' | 'history'>('overview')
  
  // Get related contacts
  const relatedContacts = contactDirectoryService.getRelatedContacts(directory, contact.id)
  const reverseRelatedContacts = contactDirectoryService.getReverseRelatedContacts(directory, contact.id)
  
  // Get primary contact method
  const primaryPhone = contact.contactMethods.find(m => 
    (m.type === 'phone' || m.type === 'mobile') && m.isPrimary
  ) || contact.contactMethods.find(m => m.type === 'phone' || m.type === 'mobile')
  
  const primaryEmail = contact.contactMethods.find(m => 
    m.type === 'email' && m.isPrimary
  ) || contact.contactMethods.find(m => m.type === 'email')

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Get trust level color
  const getTrustLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'family': return 'bg-purple-100 text-purple-800'
      case 'friends': return 'bg-blue-100 text-blue-800'
      case 'professional': return 'bg-gray-100 text-gray-800'
      case 'medical': return 'bg-red-100 text-red-800'
      case 'legal': return 'bg-indigo-100 text-indigo-800'
      case 'financial': return 'bg-green-100 text-green-800'
      case 'emergency': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {contact.photo ? (
                <img 
                  src={contact.photo} 
                  alt={contact.displayName || `${contact.firstName} ${contact.lastName}`}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl">
                  {contact.firstName[0]}{contact.lastName[0]}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">
                  {contact.displayName || `${contact.firstName} ${contact.lastName}`}
                </h2>
                {contact.nickname && (
                  <p className="text-blue-100">"{contact.nickname}"</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(contact.category)}`}>
                    {contact.category}
                  </span>
                  <span className="text-sm text-blue-100">
                    {contact.relationship}
                  </span>
                  {contact.isEmergencyContact && (
                    <span className="flex items-center text-yellow-200">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Emergency {contact.emergencyPriority && `#${contact.emergencyPriority}`}
                    </span>
                  )}
                  {contact.isFavorite && (
                    <Star className="h-4 w-4 text-yellow-300 fill-current" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={onEdit}
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 border-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                onClick={onDelete}
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 border-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {onShare && (
                <Button
                  onClick={onShare}
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 border-0"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={onClose}
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 border-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-50 px-6 py-3 border-b flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {primaryPhone && (
              <a
                href={`tel:${primaryPhone.value}`}
                className="flex items-center text-sm text-gray-600 hover:text-blue-600"
              >
                <Phone className="h-4 w-4 mr-1" />
                {primaryPhone.value}
              </a>
            )}
            {primaryEmail && (
              <a
                href={`mailto:${primaryEmail.value}`}
                className="flex items-center text-sm text-gray-600 hover:text-blue-600"
              >
                <Mail className="h-4 w-4 mr-1" />
                {primaryEmail.value}
              </a>
            )}
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getTrustLevelColor(contact.trustLevel)}`}>
            <Shield className="h-3 w-3 inline mr-1" />
            {contact.trustLevel} trust
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'relationships' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Relationships ({relatedContacts.length + reverseRelatedContacts.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'history' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Methods */}
              <section>
                <h3 className="text-lg font-semibold mb-3">Contact Methods</h3>
                <div className="space-y-2">
                  {contact.contactMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {(method.type === 'phone' || method.type === 'mobile') && <Phone className="h-4 w-4 text-gray-500" />}
                        {method.type === 'email' && <Mail className="h-4 w-4 text-gray-500" />}
                        <div>
                          <p className="font-medium">{method.value}</p>
                          <p className="text-sm text-gray-500">
                            {method.label || method.type}
                            {method.isPrimary && ' • Primary'}
                            {method.isVerified && ' • Verified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Addresses */}
              {contact.addresses.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold mb-3">Addresses</h3>
                  <div className="space-y-2">
                    {contact.addresses.map((address) => (
                      <div key={address.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                        <div>
                          <p className="font-medium">{address.label || address.type}</p>
                          <p className="text-sm text-gray-600">
                            {address.street}<br />
                            {address.city}, {address.state} {address.postalCode}<br />
                            {address.country}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Important Dates */}
              {contact.importantDates.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold mb-3">Important Dates</h3>
                  <div className="space-y-2">
                    {contact.importantDates.map((date) => (
                      <div key={date.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">{date.label || date.type}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(date.date)}
                            {date.isRecurring && ' • Recurring annually'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Notes */}
              {contact.notes && (
                <section>
                  <h3 className="text-lg font-semibold mb-3">Notes</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                </section>
              )}

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'relationships' && (
            <div className="space-y-6">
              {/* Direct Relationships */}
              {relatedContacts.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold mb-3">Related Contacts</h3>
                  <div className="space-y-3">
                    {relatedContacts.map(({ contact: relatedContact, relationship, notes }) => (
                      <div key={relatedContact.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                            {relatedContact.firstName[0]}{relatedContact.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium">
                              {relatedContact.displayName || `${relatedContact.firstName} ${relatedContact.lastName}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {relationship}
                              {notes && ` • ${notes}`}
                            </p>
                          </div>
                        </div>
                        <Link2 className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Reverse Relationships */}
              {reverseRelatedContacts.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold mb-3">Contacts Related to This Person</h3>
                  <div className="space-y-3">
                    {reverseRelatedContacts.map(({ contact: relatedContact, relationship, notes }) => (
                      <div key={relatedContact.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium">
                            {relatedContact.firstName[0]}{relatedContact.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium">
                              {relatedContact.displayName || `${relatedContact.firstName} ${relatedContact.lastName}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              Lists this contact as: {relationship}
                              {notes && ` • ${notes}`}
                            </p>
                          </div>
                        </div>
                        <Link2 className="h-4 w-4 text-gray-400 rotate-180" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {relatedContacts.length === 0 && reverseRelatedContacts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No relationships defined yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
                <Clock className="h-4 w-4 text-blue-600" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Created</p>
                  <p className="text-blue-700">{formatDate(contact.createdAt)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <Clock className="h-4 w-4 text-gray-600" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Last Updated</p>
                  <p className="text-gray-700">{formatDate(contact.updatedAt)}</p>
                </div>
              </div>

              {contact.lastContactedAt && (
                <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-lg">
                  <Clock className="h-4 w-4 text-green-600" />
                  <div className="text-sm">
                    <p className="font-medium text-green-900">Last Contacted</p>
                    <p className="text-green-700">{formatDate(contact.lastContactedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}