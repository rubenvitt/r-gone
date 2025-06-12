'use client'

import { 
  ContactEntry, 
  ContactDirectory, 
  ContactCategory, 
  ContactRelationship, 
  ContactMethod,
  ContactAddress,
  ImportantDate,
  ContactGroup,
  ContactSearchResult,
  ContactFilter,
  TrustLevel,
  ContactAccessLevel
} from '@/types/data'

export interface ContactCreateOptions {
  firstName: string
  lastName: string
  relationship?: ContactRelationship
  category?: ContactCategory
  contactMethods?: Omit<ContactMethod, 'id'>[]
  addresses?: Omit<ContactAddress, 'id'>[]
  importantDates?: Omit<ImportantDate, 'id'>[]
  notes?: string
  tags?: string[]
  trustLevel?: TrustLevel
  isEmergencyContact?: boolean
  emergencyPriority?: number
}

export class ContactDirectoryService {
  private static instance: ContactDirectoryService
  
  public static getInstance(): ContactDirectoryService {
    if (!ContactDirectoryService.instance) {
      ContactDirectoryService.instance = new ContactDirectoryService()
    }
    return ContactDirectoryService.instance
  }

  /**
   * Validate contact data
   */
  validateContact(options: ContactCreateOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Required fields
    if (!options.firstName?.trim()) {
      errors.push('First name is required')
    }
    if (!options.lastName?.trim()) {
      errors.push('Last name is required')
    }

    // Validate contact methods
    if (options.contactMethods) {
      options.contactMethods.forEach((method, index) => {
        if (!method.value?.trim()) {
          errors.push(`Contact method ${index + 1} value is required`)
        }
        
        // Email validation
        if (method.type === 'email' && method.value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(method.value)) {
            errors.push(`Invalid email format for contact method ${index + 1}`)
          }
        }
        
        // Phone validation (basic)
        if ((method.type === 'phone' || method.type === 'mobile') && method.value) {
          const phoneRegex = /^[\d\s\-\+\(\)]+$/
          if (!phoneRegex.test(method.value)) {
            errors.push(`Invalid phone format for contact method ${index + 1}`)
          }
        }
      })
    }

    // Validate addresses
    if (options.addresses) {
      options.addresses.forEach((address, index) => {
        if (!address.street?.trim() || !address.city?.trim() || !address.country?.trim()) {
          errors.push(`Address ${index + 1} is incomplete`)
        }
      })
    }

    // Validate important dates
    if (options.importantDates) {
      options.importantDates.forEach((date, index) => {
        if (!date.date) {
          errors.push(`Important date ${index + 1} is required`)
        }
      })
    }

    // Validate emergency priority
    if (options.emergencyPriority !== undefined) {
      if (options.emergencyPriority < 1 || options.emergencyPriority > 10) {
        errors.push('Emergency priority must be between 1 and 10')
      }
      if (!options.isEmergencyContact) {
        errors.push('Emergency priority can only be set for emergency contacts')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Create a new empty contact directory
   */
  createEmptyDirectory(): ContactDirectory {
    return {
      contacts: [],
      categories: ['personal', 'family', 'friends', 'professional', 'business', 'medical', 'legal', 'financial', 'emergency', 'service', 'other'],
      relationships: ['family', 'spouse', 'partner', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'friend', 'colleague', 'business', 'professional', 'medical', 'legal', 'financial', 'neighbor', 'acquaintance', 'other'],
      groups: [
        {
          id: 'favorites',
          name: 'Favorites',
          description: 'Favorite contacts',
          contactIds: [],
          color: '#fbbf24',
          icon: '⭐',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isSystem: true
        },
        {
          id: 'emergency',
          name: 'Emergency Contacts',
          description: 'Emergency contacts',
          contactIds: [],
          color: '#ef4444',
          icon: '🚨',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isSystem: true
        }
      ],
      settings: {
        defaultCategory: 'personal',
        defaultTrustLevel: 'medium',
        enableGeolocation: false,
        enableSocialSync: false,
        duplicateDetection: {
          enabled: true,
          threshold: 0.8
        },
        privacy: {
          shareContacts: false,
          allowExport: true,
          encryptPhotos: true
        },
        reminders: {
          enabled: true,
          birthdayReminder: 7,
          anniversaryReminder: 14
        }
      },
      statistics: {
        totalContacts: 0,
        contactsByCategory: {
          personal: 0,
          family: 0,
          friends: 0,
          professional: 0,
          business: 0,
          medical: 0,
          legal: 0,
          financial: 0,
          emergency: 0,
          service: 0,
          other: 0
        },
        contactsByRelationship: {
          family: 0,
          spouse: 0,
          partner: 0,
          child: 0,
          parent: 0,
          sibling: 0,
          grandparent: 0,
          grandchild: 0,
          friend: 0,
          colleague: 0,
          business: 0,
          professional: 0,
          medical: 0,
          legal: 0,
          financial: 0,
          neighbor: 0,
          acquaintance: 0,
          other: 0
        },
        favoriteContacts: 0,
        emergencyContacts: 0,
        recentlyAdded: 0,
        lastAnalysis: new Date().toISOString()
      }
    }
  }

  /**
   * Add a new contact
   */
  addContact(directory: ContactDirectory, options: ContactCreateOptions): ContactDirectory {
    // Validate contact data
    const validation = this.validateContact(options)
    if (!validation.isValid) {
      throw new Error(`Invalid contact data: ${validation.errors.join(', ')}`)
    }

    const contact: ContactEntry = {
      id: crypto.randomUUID(),
      firstName: options.firstName.trim(),
      lastName: options.lastName.trim(),
      displayName: `${options.firstName.trim()} ${options.lastName.trim()}`,
      relationship: options.relationship || 'other',
      category: options.category || directory.settings.defaultCategory,
      contactMethods: options.contactMethods?.map(method => ({
        ...method,
        id: crypto.randomUUID()
      })) || [],
      addresses: options.addresses?.map(address => ({
        ...address,
        id: crypto.randomUUID()
      })) || [],
      importantDates: options.importantDates?.map(date => ({
        ...date,
        id: crypto.randomUUID()
      })) || [],
      notes: options.notes?.trim(),
      tags: options.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trustLevel: options.trustLevel || directory.settings.defaultTrustLevel,
      isEmergencyContact: options.isEmergencyContact || false,
      emergencyPriority: options.emergencyPriority
    }

    const updatedDirectory = {
      ...directory,
      contacts: [...directory.contacts, contact]
    }

    // Update system groups
    if (contact.isFavorite) {
      this.addContactToGroup(updatedDirectory, contact.id, 'favorites')
    }
    
    if (contact.isEmergencyContact) {
      this.addContactToGroup(updatedDirectory, contact.id, 'emergency')
    }

    return this.updateStatistics(updatedDirectory)
  }

  /**
   * Update an existing contact
   */
  updateContact(directory: ContactDirectory, contactId: string, updates: Partial<ContactEntry>): ContactDirectory {
    const contactIndex = directory.contacts.findIndex(c => c.id === contactId)
    if (contactIndex === -1) {
      throw new Error('Contact not found')
    }

    const currentContact = directory.contacts[contactIndex]
    const updatedContact: ContactEntry = {
      ...currentContact,
      ...updates,
      id: contactId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
      displayName: updates.firstName || updates.lastName 
        ? `${updates.firstName || currentContact.firstName} ${updates.lastName || currentContact.lastName}`
        : currentContact.displayName
    }

    const updatedContacts = [...directory.contacts]
    updatedContacts[contactIndex] = updatedContact

    const updatedDirectory = {
      ...directory,
      contacts: updatedContacts
    }

    // Update system groups based on changes
    if (updates.isFavorite !== undefined) {
      if (updates.isFavorite) {
        this.addContactToGroup(updatedDirectory, contactId, 'favorites')
      } else {
        this.removeContactFromGroup(updatedDirectory, contactId, 'favorites')
      }
    }

    if (updates.isEmergencyContact !== undefined) {
      if (updates.isEmergencyContact) {
        this.addContactToGroup(updatedDirectory, contactId, 'emergency')
      } else {
        this.removeContactFromGroup(updatedDirectory, contactId, 'emergency')
      }
    }

    return this.updateStatistics(updatedDirectory)
  }

  /**
   * Delete a contact
   */
  deleteContact(directory: ContactDirectory, contactId: string): ContactDirectory {
    // Remove from all groups first
    const updatedGroups = directory.groups.map(group => ({
      ...group,
      contactIds: group.contactIds.filter(id => id !== contactId)
    }))

    // Remove this contact from all other contacts' relatedContacts
    const updatedContacts = directory.contacts
      .filter(c => c.id !== contactId)
      .map(contact => {
        if (contact.relatedContacts?.some(rc => rc.contactId === contactId)) {
          return {
            ...contact,
            relatedContacts: contact.relatedContacts.filter(rc => rc.contactId !== contactId)
          }
        }
        return contact
      })

    const updatedDirectory = {
      ...directory,
      contacts: updatedContacts,
      groups: updatedGroups
    }

    return this.updateStatistics(updatedDirectory)
  }

  /**
   * Add a relationship between two contacts
   */
  addRelationship(
    directory: ContactDirectory, 
    contactId: string, 
    relatedContactId: string, 
    relationship: string,
    notes?: string
  ): ContactDirectory {
    const contactIndex = directory.contacts.findIndex(c => c.id === contactId)
    const relatedContactIndex = directory.contacts.findIndex(c => c.id === relatedContactId)
    
    if (contactIndex === -1 || relatedContactIndex === -1) {
      throw new Error('One or both contacts not found')
    }

    if (contactId === relatedContactId) {
      throw new Error('Cannot create relationship with self')
    }

    const updatedContacts = [...directory.contacts]
    const contact = { ...updatedContacts[contactIndex] }
    
    // Initialize relatedContacts if not exists
    if (!contact.relatedContacts) {
      contact.relatedContacts = []
    }

    // Check if relationship already exists
    if (contact.relatedContacts.some(rc => rc.contactId === relatedContactId)) {
      throw new Error('Relationship already exists')
    }

    // Add the relationship
    contact.relatedContacts = [
      ...contact.relatedContacts,
      { contactId: relatedContactId, relationship, notes }
    ]

    contact.updatedAt = new Date().toISOString()
    updatedContacts[contactIndex] = contact

    return {
      ...directory,
      contacts: updatedContacts
    }
  }

  /**
   * Remove a relationship between two contacts
   */
  removeRelationship(
    directory: ContactDirectory,
    contactId: string,
    relatedContactId: string
  ): ContactDirectory {
    const contactIndex = directory.contacts.findIndex(c => c.id === contactId)
    
    if (contactIndex === -1) {
      throw new Error('Contact not found')
    }

    const updatedContacts = [...directory.contacts]
    const contact = { ...updatedContacts[contactIndex] }
    
    if (!contact.relatedContacts) {
      return directory
    }

    contact.relatedContacts = contact.relatedContacts.filter(
      rc => rc.contactId !== relatedContactId
    )
    contact.updatedAt = new Date().toISOString()
    updatedContacts[contactIndex] = contact

    return {
      ...directory,
      contacts: updatedContacts
    }
  }

  /**
   * Get all contacts related to a specific contact
   */
  getRelatedContacts(directory: ContactDirectory, contactId: string): {
    contact: ContactEntry,
    relationship: string,
    notes?: string
  }[] {
    const contact = directory.contacts.find(c => c.id === contactId)
    if (!contact || !contact.relatedContacts) {
      return []
    }

    return contact.relatedContacts
      .map(rc => {
        const relatedContact = directory.contacts.find(c => c.id === rc.contactId)
        if (!relatedContact) return null
        
        return {
          contact: relatedContact,
          relationship: rc.relationship,
          notes: rc.notes
        }
      })
      .filter(Boolean) as { contact: ContactEntry, relationship: string, notes?: string }[]
  }

  /**
   * Get all contacts that have a relationship with a specific contact
   */
  getReverseRelatedContacts(directory: ContactDirectory, contactId: string): {
    contact: ContactEntry,
    relationship: string,
    notes?: string
  }[] {
    return directory.contacts
      .filter(c => c.relatedContacts?.some(rc => rc.contactId === contactId))
      .map(c => {
        const relationship = c.relatedContacts!.find(rc => rc.contactId === contactId)!
        return {
          contact: c,
          relationship: relationship.relationship,
          notes: relationship.notes
        }
      })
  }

  /**
   * Get emergency contacts sorted by priority
   */
  getEmergencyContacts(directory: ContactDirectory): ContactEntry[] {
    return directory.contacts
      .filter(c => c.isEmergencyContact)
      .sort((a, b) => {
        // Sort by priority (1 = highest), then by name
        const priorityA = a.emergencyPriority || 999
        const priorityB = b.emergencyPriority || 999
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }
        
        const nameA = a.displayName || `${a.firstName} ${a.lastName}`
        const nameB = b.displayName || `${b.firstName} ${b.lastName}`
        return nameA.localeCompare(nameB)
      })
  }

  /**
   * Update emergency priority
   */
  updateEmergencyPriority(
    directory: ContactDirectory,
    contactId: string,
    priority: number | undefined
  ): ContactDirectory {
    const contactIndex = directory.contacts.findIndex(c => c.id === contactId)
    
    if (contactIndex === -1) {
      throw new Error('Contact not found')
    }

    const contact = directory.contacts[contactIndex]
    
    if (priority !== undefined && !contact.isEmergencyContact) {
      throw new Error('Can only set priority for emergency contacts')
    }

    if (priority !== undefined && (priority < 1 || priority > 10)) {
      throw new Error('Priority must be between 1 and 10')
    }

    const updatedContacts = [...directory.contacts]
    updatedContacts[contactIndex] = {
      ...contact,
      emergencyPriority: priority,
      updatedAt: new Date().toISOString()
    }

    return {
      ...directory,
      contacts: updatedContacts
    }
  }

  /**
   * Search contacts
   */
  searchContacts(directory: ContactDirectory, query: string): ContactSearchResult[] {
    if (!query.trim()) {
      return directory.contacts.map(contact => ({
        contact,
        relevanceScore: 1,
        matchedFields: [],
        highlights: []
      }))
    }

    const searchTerm = query.toLowerCase()
    const results: ContactSearchResult[] = []

    directory.contacts.forEach(contact => {
      let relevanceScore = 0
      const matchedFields: string[] = []
      const highlights: ContactSearchResult['highlights'] = []

      // Search in name fields
      if (contact.firstName.toLowerCase().includes(searchTerm)) {
        relevanceScore += 10
        matchedFields.push('firstName')
      }
      if (contact.lastName.toLowerCase().includes(searchTerm)) {
        relevanceScore += 10
        matchedFields.push('lastName')
      }
      if (contact.displayName?.toLowerCase().includes(searchTerm)) {
        relevanceScore += 8
        matchedFields.push('displayName')
      }
      if (contact.nickname?.toLowerCase().includes(searchTerm)) {
        relevanceScore += 6
        matchedFields.push('nickname')
      }

      // Search in contact methods
      contact.contactMethods.forEach(method => {
        if (method.value.toLowerCase().includes(searchTerm) || method.label?.toLowerCase().includes(searchTerm)) {
          relevanceScore += 7
          matchedFields.push('contactMethods')
        }
      })

      // Search in notes
      if (contact.notes?.toLowerCase().includes(searchTerm)) {
        relevanceScore += 5
        matchedFields.push('notes')
      }

      // Search in tags
      if (contact.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) {
        relevanceScore += 4
        matchedFields.push('tags')
      }

      // Search in addresses
      contact.addresses.forEach(address => {
        const addressText = `${address.street} ${address.city} ${address.state || ''} ${address.country}`.toLowerCase()
        if (addressText.includes(searchTerm)) {
          relevanceScore += 3
          matchedFields.push('addresses')
        }
      })

      if (relevanceScore > 0) {
        results.push({
          contact,
          relevanceScore,
          matchedFields,
          highlights
        })
      }
    })

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Filter contacts
   */
  filterContacts(directory: ContactDirectory, filter: ContactFilter): ContactEntry[] {
    let contacts = directory.contacts

    // Category filter
    if (filter.category && filter.category !== 'all') {
      contacts = contacts.filter(contact => contact.category === filter.category)
    }

    // Relationship filter
    if (filter.relationship && filter.relationship !== 'all') {
      contacts = contacts.filter(contact => contact.relationship === filter.relationship)
    }

    // Trust level filter
    if (filter.trustLevel && filter.trustLevel !== 'all') {
      contacts = contacts.filter(contact => contact.trustLevel === filter.trustLevel)
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      contacts = contacts.filter(contact =>
        contact.tags?.some(tag => filter.tags!.includes(tag))
      )
    }

    // Favorite filter
    if (filter.isFavorite !== undefined) {
      contacts = contacts.filter(contact => !!contact.isFavorite === filter.isFavorite)
    }

    // Emergency contact filter
    if (filter.isEmergencyContact !== undefined) {
      contacts = contacts.filter(contact => !!contact.isEmergencyContact === filter.isEmergencyContact)
    }

    // Photo filter
    if (filter.hasPhoto !== undefined) {
      contacts = contacts.filter(contact => !!contact.photo === filter.hasPhoto)
    }

    // Last contacted filter
    if (filter.lastContactedDays !== undefined) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - filter.lastContactedDays)
      contacts = contacts.filter(contact => {
        if (!contact.lastContactedAt) return false
        return new Date(contact.lastContactedAt) >= cutoffDate
      })
    }

    // Groups filter
    if (filter.groups && filter.groups.length > 0) {
      const contactIdsInGroups = new Set<string>()
      directory.groups.forEach(group => {
        if (filter.groups!.includes(group.id)) {
          group.contactIds.forEach(contactId => contactIdsInGroups.add(contactId))
        }
      })
      contacts = contacts.filter(contact => contactIdsInGroups.has(contact.id))
    }

    return contacts
  }

  /**
   * Get contacts by category
   */
  getContactsByCategory(directory: ContactDirectory, category: ContactCategory): ContactEntry[] {
    return directory.contacts.filter(contact => contact.category === category)
  }

  /**
   * Get contacts by relationship
   */
  getContactsByRelationship(directory: ContactDirectory, relationship: ContactRelationship): ContactEntry[] {
    return directory.contacts.filter(contact => contact.relationship === relationship)
  }

  /**
   * Get favorite contacts
   */
  getFavoriteContacts(directory: ContactDirectory): ContactEntry[] {
    return directory.contacts.filter(contact => contact.isFavorite)
  }

  /**
   * Get emergency contacts
   */
  getEmergencyContacts(directory: ContactDirectory): ContactEntry[] {
    return directory.contacts.filter(contact => contact.isEmergencyContact)
  }

  /**
   * Create a contact group
   */
  createGroup(directory: ContactDirectory, name: string, description?: string): ContactDirectory {
    const group: ContactGroup = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim(),
      contactIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return {
      ...directory,
      groups: [...directory.groups, group]
    }
  }

  /**
   * Update a contact group
   */
  updateGroup(directory: ContactDirectory, groupId: string, updates: Partial<ContactGroup>): ContactDirectory {
    const groupIndex = directory.groups.findIndex(g => g.id === groupId)
    if (groupIndex === -1) {
      throw new Error('Group not found')
    }

    const updatedGroup = {
      ...directory.groups[groupIndex],
      ...updates,
      id: groupId,
      updatedAt: new Date().toISOString()
    }

    const updatedGroups = [...directory.groups]
    updatedGroups[groupIndex] = updatedGroup

    return {
      ...directory,
      groups: updatedGroups
    }
  }

  /**
   * Delete a contact group
   */
  deleteGroup(directory: ContactDirectory, groupId: string): ContactDirectory {
    const group = directory.groups.find(g => g.id === groupId)
    if (group?.isSystem) {
      throw new Error('Cannot delete system group')
    }

    return {
      ...directory,
      groups: directory.groups.filter(g => g.id !== groupId)
    }
  }

  /**
   * Add contact to group
   */
  addContactToGroup(directory: ContactDirectory, contactId: string, groupId: string): ContactDirectory {
    const groupIndex = directory.groups.findIndex(g => g.id === groupId)
    if (groupIndex === -1) {
      throw new Error('Group not found')
    }

    const group = directory.groups[groupIndex]
    if (!group.contactIds.includes(contactId)) {
      const updatedGroups = [...directory.groups]
      updatedGroups[groupIndex] = {
        ...group,
        contactIds: [...group.contactIds, contactId],
        updatedAt: new Date().toISOString()
      }

      return {
        ...directory,
        groups: updatedGroups
      }
    }

    return directory
  }

  /**
   * Remove contact from group
   */
  removeContactFromGroup(directory: ContactDirectory, contactId: string, groupId: string): ContactDirectory {
    const groupIndex = directory.groups.findIndex(g => g.id === groupId)
    if (groupIndex === -1) {
      throw new Error('Group not found')
    }

    const group = directory.groups[groupIndex]
    const updatedGroups = [...directory.groups]
    updatedGroups[groupIndex] = {
      ...group,
      contactIds: group.contactIds.filter(id => id !== contactId),
      updatedAt: new Date().toISOString()
    }

    return {
      ...directory,
      groups: updatedGroups
    }
  }

  /**
   * Get contacts in group
   */
  getContactsInGroup(directory: ContactDirectory, groupId: string): ContactEntry[] {
    const group = directory.groups.find(g => g.id === groupId)
    if (!group) return []

    return directory.contacts.filter(contact => group.contactIds.includes(contact.id))
  }

  /**
   * Detect potential duplicate contacts
   */
  detectDuplicates(directory: ContactDirectory): ContactEntry[][] {
    const duplicateGroups: ContactEntry[][] = []
    const processed = new Set<string>()

    directory.contacts.forEach(contact => {
      if (processed.has(contact.id)) return

      const duplicates = [contact]
      const contactName = `${contact.firstName} ${contact.lastName}`.toLowerCase()

      directory.contacts.forEach(otherContact => {
        if (otherContact.id === contact.id || processed.has(otherContact.id)) return

        const otherName = `${otherContact.firstName} ${otherContact.lastName}`.toLowerCase()
        let similarity = 0

        // Name similarity
        if (contactName === otherName) {
          similarity += 0.6
        } else if (this.calculateStringSimilarity(contactName, otherName) > 0.8) {
          similarity += 0.4
        }

        // Email similarity
        const contactEmails = contact.contactMethods.filter(m => m.type === 'email').map(m => m.value.toLowerCase())
        const otherEmails = otherContact.contactMethods.filter(m => m.type === 'email').map(m => m.value.toLowerCase())
        
        if (contactEmails.some(email => otherEmails.includes(email))) {
          similarity += 0.3
        }

        // Phone similarity
        const contactPhones = contact.contactMethods.filter(m => ['phone', 'mobile'].includes(m.type)).map(m => this.normalizePhone(m.value))
        const otherPhones = otherContact.contactMethods.filter(m => ['phone', 'mobile'].includes(m.type)).map(m => this.normalizePhone(m.value))
        
        if (contactPhones.some(phone => otherPhones.includes(phone))) {
          similarity += 0.3
        }

        if (similarity >= directory.settings.duplicateDetection.threshold) {
          duplicates.push(otherContact)
          processed.add(otherContact.id)
        }
      })

      if (duplicates.length > 1) {
        duplicateGroups.push(duplicates)
      }
      processed.add(contact.id)
    })

    return duplicateGroups
  }

  /**
   * Mark contact as contacted
   */
  markAsContacted(directory: ContactDirectory, contactId: string): ContactDirectory {
    return this.updateContact(directory, contactId, {
      lastContactedAt: new Date().toISOString()
    })
  }

  /**
   * Get upcoming birthdays
   */
  getUpcomingBirthdays(directory: ContactDirectory, days: number = 30): Array<{contact: ContactEntry, date: ImportantDate, daysUntil: number}> {
    const today = new Date()
    const upcoming: Array<{contact: ContactEntry, date: ImportantDate, daysUntil: number}> = []

    directory.contacts.forEach(contact => {
      contact.importantDates.forEach(date => {
        if (date.type === 'birthday') {
          const birthDate = new Date(date.date)
          const thisYear = today.getFullYear()
          const birthdayThisYear = new Date(thisYear, birthDate.getMonth(), birthDate.getDate())
          
          if (birthdayThisYear < today) {
            birthdayThisYear.setFullYear(thisYear + 1)
          }

          const daysUntil = Math.ceil((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysUntil <= days) {
            upcoming.push({ contact, date, daysUntil })
          }
        }
      })
    })

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil)
  }

  /**
   * Export contacts to vCard format
   */
  exportToVCard(contacts: ContactEntry[]): string {
    return contacts.map(contact => this.contactToVCard(contact)).join('\n\n')
  }

  /**
   * Convert single contact to vCard format
   */
  private contactToVCard(contact: ContactEntry): string {
    let vcard = 'BEGIN:VCARD\nVERSION:3.0\n'
    
    vcard += `FN:${contact.displayName || `${contact.firstName} ${contact.lastName}`}\n`
    vcard += `N:${contact.lastName};${contact.firstName};;;\n`
    
    if (contact.nickname) {
      vcard += `NICKNAME:${contact.nickname}\n`
    }

    contact.contactMethods.forEach(method => {
      switch (method.type) {
        case 'phone':
        case 'mobile':
          vcard += `TEL;TYPE=${method.type.toUpperCase()}:${method.value}\n`
          break
        case 'email':
          vcard += `EMAIL:${method.value}\n`
          break
        case 'website':
          vcard += `URL:${method.value}\n`
          break
      }
    })

    contact.addresses.forEach(address => {
      vcard += `ADR;TYPE=${address.type.toUpperCase()}:;;${address.street};${address.city};${address.state || ''};${address.postalCode || ''};${address.country}\n`
    })

    contact.importantDates.forEach(date => {
      if (date.type === 'birthday') {
        vcard += `BDAY:${date.date}\n`
      }
    })

    if (contact.notes) {
      vcard += `NOTE:${contact.notes.replace(/\n/g, '\\n')}\n`
    }

    vcard += 'END:VCARD'
    return vcard
  }

  /**
   * Calculate string similarity
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Normalize phone number for comparison
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  /**
   * Update directory statistics
   */
  private updateStatistics(directory: ContactDirectory): ContactDirectory {
    const stats = {
      totalContacts: directory.contacts.length,
      contactsByCategory: {} as Record<ContactCategory, number>,
      contactsByRelationship: {} as Record<ContactRelationship, number>,
      favoriteContacts: directory.contacts.filter(c => c.isFavorite).length,
      emergencyContacts: directory.contacts.filter(c => c.isEmergencyContact).length,
      recentlyAdded: 0,
      lastAnalysis: new Date().toISOString()
    }

    // Initialize counts
    directory.categories.forEach(category => {
      stats.contactsByCategory[category] = 0
    })
    directory.relationships.forEach(relationship => {
      stats.contactsByRelationship[relationship] = 0
    })

    // Count contacts
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    directory.contacts.forEach(contact => {
      stats.contactsByCategory[contact.category]++
      stats.contactsByRelationship[contact.relationship]++
      
      if (new Date(contact.createdAt) > thirtyDaysAgo) {
        stats.recentlyAdded++
      }
    })

    return {
      ...directory,
      statistics: stats
    }
  }
}

// Export singleton instance
export const contactDirectoryService = ContactDirectoryService.getInstance()