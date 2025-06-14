import { 
  Template, 
  TemplateCategory, 
  TemplateScenario, 
  TemplateLibrary,
  TemplateApplicationResult,
  TemplateAction
} from '@/types/templates'

class TemplateLibraryService {
  private static instance: TemplateLibraryService

  public static getInstance(): TemplateLibraryService {
    if (!TemplateLibraryService.instance) {
      TemplateLibraryService.instance = new TemplateLibraryService()
    }
    return TemplateLibraryService.instance
  }

  /**
   * Get default template library
   */
  getDefaultLibrary(): TemplateLibrary {
    return {
      categories: this.getDefaultCategories(),
      templates: this.getDefaultTemplates(),
      scenarios: this.getDefaultScenarios()
    }
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(library: TemplateLibrary, categoryId: string): Template[] {
    return library.templates.filter(t => t.categoryId === categoryId)
  }

  /**
   * Get templates by scenario
   */
  getTemplatesByScenario(library: TemplateLibrary, scenarioId: string): Template[] {
    const scenario = library.scenarios.find(s => s.id === scenarioId)
    if (!scenario) return []
    
    return library.templates.filter(t => scenario.templateIds.includes(t.id))
  }

  /**
   * Search templates
   */
  searchTemplates(library: TemplateLibrary, query: string): Template[] {
    const searchTerm = query.toLowerCase()
    
    return library.templates.filter(template => {
      const nameMatch = template.name.toLowerCase().includes(searchTerm)
      const descMatch = template.description.toLowerCase().includes(searchTerm)
      const tagMatch = template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      
      return nameMatch || descMatch || tagMatch
    })
  }

  /**
   * Apply a template
   */
  async applyTemplate(
    templateId: string,
    fieldValues: Record<string, any>,
    options: {
      skipValidation?: boolean
      dryRun?: boolean
    } = {}
  ): Promise<TemplateApplicationResult> {
    const library = this.getDefaultLibrary()
    const template = library.templates.find(t => t.id === templateId)
    
    if (!template) {
      throw new Error('Template not found')
    }

    // Validate field values
    if (!options.skipValidation) {
      this.validateFieldValues(template, fieldValues)
    }

    // Process actions
    const results: TemplateApplicationResult = {
      success: true,
      applied: [{
        templateId,
        actions: []
      }],
      summary: {
        total: template.actions.length,
        successful: 0,
        failed: 0,
        skipped: 0
      }
    }

    // Sort actions by order
    const sortedActions = [...template.actions].sort((a, b) => a.order - b.order)

    for (const action of sortedActions) {
      if (options.dryRun) {
        results.applied[0].actions.push({
          actionId: action.id,
          success: true,
          result: { dryRun: true, wouldExecute: action }
        })
        results.summary.successful++
      } else {
        try {
          const result = await this.executeAction(action, fieldValues)
          results.applied[0].actions.push({
            actionId: action.id,
            success: true,
            result
          })
          results.summary.successful++
        } catch (error) {
          results.applied[0].actions.push({
            actionId: action.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          results.summary.failed++
          results.success = false
        }
      }
    }

    // Update template usage
    if (!options.dryRun && results.success) {
      // In a real implementation, this would persist the usage count
      template.metadata.usage++
    }

    return results
  }

  /**
   * Validate field values against template requirements
   */
  private validateFieldValues(template: Template, values: Record<string, any>): void {
    for (const field of template.fields) {
      const value = values[field.id]

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        throw new Error(`Field "${field.label}" is required`)
      }

      // Type-specific validation
      if (value !== undefined && value !== null) {
        switch (field.type) {
          case 'email':
            if (!this.isValidEmail(value)) {
              throw new Error(`Invalid email format for "${field.label}"`)
            }
            break
          case 'url':
            if (!this.isValidUrl(value)) {
              throw new Error(`Invalid URL format for "${field.label}"`)
            }
            break
          case 'number':
            if (isNaN(Number(value))) {
              throw new Error(`"${field.label}" must be a number`)
            }
            if (field.validation?.min !== undefined && Number(value) < field.validation.min) {
              throw new Error(`"${field.label}" must be at least ${field.validation.min}`)
            }
            if (field.validation?.max !== undefined && Number(value) > field.validation.max) {
              throw new Error(`"${field.label}" must be at most ${field.validation.max}`)
            }
            break
        }

        // Custom pattern validation
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern)
          if (!regex.test(String(value))) {
            throw new Error(field.validation.message || `Invalid format for "${field.label}"`)
          }
        }
      }
    }
  }

  /**
   * Execute a template action
   */
  private async executeAction(action: TemplateAction, fieldValues: Record<string, any>): Promise<any> {
    // Process action data with field values
    const processedData = this.processTemplateVariables(action.data, fieldValues)

    // In a real implementation, this would call the appropriate service
    // For now, we'll simulate the execution
    switch (action.type) {
      case 'create_contact':
        return { type: 'contact', id: crypto.randomUUID(), ...processedData }
      case 'create_asset':
        return { type: 'asset', id: crypto.randomUUID(), ...processedData }
      case 'create_file':
        return { type: 'file', id: crypto.randomUUID(), ...processedData }
      case 'create_message':
        return { type: 'message', id: crypto.randomUUID(), ...processedData }
      case 'create_password':
        return { type: 'password', id: crypto.randomUUID(), ...processedData }
      case 'configure_setting':
        return { type: 'setting', ...processedData }
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  /**
   * Process template variables in data
   */
  private processTemplateVariables(data: any, variables: Record<string, any>): any {
    if (typeof data === 'string') {
      return data.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] !== undefined ? String(variables[varName]) : match
      })
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.processTemplateVariables(item, variables))
    }
    
    if (typeof data === 'object' && data !== null) {
      const processed: any = {}
      for (const [key, value] of Object.entries(data)) {
        processed[key] = this.processTemplateVariables(value, variables)
      }
      return processed
    }
    
    return data
  }

  /**
   * Validation helpers
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get default categories
   */
  private getDefaultCategories(): TemplateCategory[] {
    return [
      {
        id: 'essential',
        name: 'Essential Setup',
        description: 'Critical information everyone should have',
        icon: '⚡',
        color: 'red',
        order: 1
      },
      {
        id: 'family',
        name: 'Family & Personal',
        description: 'Family contacts, messages, and personal wishes',
        icon: '👨‍👩‍👧‍👦',
        color: 'blue',
        order: 2
      },
      {
        id: 'financial',
        name: 'Financial & Assets',
        description: 'Bank accounts, investments, and valuable assets',
        icon: '💰',
        color: 'green',
        order: 3
      },
      {
        id: 'digital',
        name: 'Digital Life',
        description: 'Online accounts, subscriptions, and digital assets',
        icon: '💻',
        color: 'purple',
        order: 4
      },
      {
        id: 'medical',
        name: 'Medical & Healthcare',
        description: 'Medical information, directives, and healthcare contacts',
        icon: '🏥',
        color: 'pink',
        order: 5
      },
      {
        id: 'legal',
        name: 'Legal & Documents',
        description: 'Important documents, legal contacts, and instructions',
        icon: '⚖️',
        color: 'gray',
        order: 6
      }
    ]
  }

  /**
   * Get default templates
   */
  private getDefaultTemplates(): Template[] {
    return [
      // Essential Setup Templates
      {
        id: 'emergency-contacts',
        categoryId: 'essential',
        name: 'Emergency Contacts List',
        description: 'Create a comprehensive list of emergency contacts including family, doctors, and legal representatives',
        shortDescription: 'Essential contacts for emergencies',
        icon: '📞',
        tags: ['contacts', 'emergency', 'essential', 'family'],
        difficulty: 'beginner',
        timeEstimate: 10,
        fields: [
          {
            id: 'primaryContact',
            label: 'Primary Emergency Contact Name',
            type: 'text',
            placeholder: 'e.g., John Doe',
            required: true
          },
          {
            id: 'primaryPhone',
            label: 'Primary Contact Phone',
            type: 'text',
            placeholder: '+1 (555) 123-4567',
            required: true
          },
          {
            id: 'primaryRelation',
            label: 'Relationship',
            type: 'select',
            required: true,
            options: [
              { value: 'spouse', label: 'Spouse' },
              { value: 'child', label: 'Child' },
              { value: 'parent', label: 'Parent' },
              { value: 'sibling', label: 'Sibling' },
              { value: 'friend', label: 'Friend' },
              { value: 'other', label: 'Other' }
            ]
          },
          {
            id: 'doctorName',
            label: 'Primary Doctor Name',
            type: 'text',
            placeholder: 'Dr. Jane Smith',
            required: false
          },
          {
            id: 'doctorPhone',
            label: 'Doctor Phone',
            type: 'text',
            placeholder: '+1 (555) 234-5678',
            required: false
          }
        ],
        actions: [
          {
            id: 'create-primary-contact',
            type: 'create_contact',
            target: 'contacts',
            data: {
              name: '{{primaryContact}}',
              phone: '{{primaryPhone}}',
              relationship: '{{primaryRelation}}',
              category: 'emergency',
              isPrimary: true
            },
            order: 1
          },
          {
            id: 'create-doctor-contact',
            type: 'create_contact',
            target: 'contacts',
            data: {
              name: '{{doctorName}}',
              phone: '{{doctorPhone}}',
              category: 'medical',
              type: 'doctor'
            },
            order: 2
          }
        ],
        preview: {
          items: [
            {
              type: 'contact',
              title: 'Primary Emergency Contact',
              description: 'Your main point of contact in emergencies'
            },
            {
              type: 'contact',
              title: 'Medical Contacts',
              description: 'Doctors and healthcare providers'
            }
          ]
        },
        metadata: {
          author: 'System',
          version: '1.0.0',
          locale: 'en',
          isSystem: true,
          isPublic: true,
          usage: 0,
          rating: 4.9,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },

      // Family & Personal Templates
      {
        id: 'farewell-messages',
        categoryId: 'family',
        name: 'Farewell Messages Setup',
        description: 'Create heartfelt farewell messages for your loved ones with guided prompts',
        shortDescription: 'Personal goodbye messages',
        icon: '💌',
        tags: ['messages', 'farewell', 'family', 'personal'],
        difficulty: 'intermediate',
        timeEstimate: 30,
        fields: [
          {
            id: 'recipientName',
            label: 'Recipient Name',
            type: 'text',
            placeholder: 'e.g., Sarah',
            required: true
          },
          {
            id: 'relationship',
            label: 'Your Relationship',
            type: 'text',
            placeholder: 'e.g., My beloved daughter',
            required: true
          },
          {
            id: 'favoriteMemory',
            label: 'Favorite Memory Together',
            type: 'textarea',
            placeholder: 'Describe a cherished memory...',
            required: true
          },
          {
            id: 'lifeAdvice',
            label: 'Life Advice',
            type: 'textarea',
            placeholder: 'What wisdom would you like to share?',
            required: true
          },
          {
            id: 'finalWishes',
            label: 'Final Wishes for Them',
            type: 'textarea',
            placeholder: 'What do you hope for their future?',
            required: true
          }
        ],
        actions: [
          {
            id: 'create-farewell-message',
            type: 'create_message',
            target: 'messages',
            data: {
              type: 'farewell',
              title: 'To {{recipientName}} - A Final Message',
              content: {
                text: `<p>{{relationship}},</p>
<p>If you're reading this, it means I'm no longer with you, but my love for you lives on forever.</p>
<p>I want to share with you one of my most treasured memories: {{favoriteMemory}}</p>
<p>As you continue your journey, remember this: {{lifeAdvice}}</p>
<p>My final wishes for you: {{finalWishes}}</p>
<p>Until we meet again,<br>With all my love</p>`
              },
              recipients: [{
                name: '{{recipientName}}',
                relationship: '{{relationship}}'
              }]
            },
            order: 1
          }
        ],
        preview: {
          items: [
            {
              type: 'message',
              title: 'Personal Farewell Message',
              description: 'A heartfelt goodbye with memories and advice'
            }
          ]
        },
        metadata: {
          author: 'System',
          version: '1.0.0',
          locale: 'en',
          isSystem: true,
          isPublic: true,
          usage: 0,
          rating: 4.8,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },

      // Financial Templates
      {
        id: 'bank-accounts',
        categoryId: 'financial',
        name: 'Bank Accounts Documentation',
        description: 'Document all bank accounts with account numbers and access instructions',
        shortDescription: 'Bank account details',
        icon: '🏦',
        tags: ['financial', 'banking', 'accounts', 'money'],
        difficulty: 'beginner',
        timeEstimate: 15,
        fields: [
          {
            id: 'bankName',
            label: 'Bank Name',
            type: 'text',
            placeholder: 'e.g., Chase Bank',
            required: true
          },
          {
            id: 'accountType',
            label: 'Account Type',
            type: 'select',
            required: true,
            options: [
              { value: 'checking', label: 'Checking' },
              { value: 'savings', label: 'Savings' },
              { value: 'money_market', label: 'Money Market' },
              { value: 'cd', label: 'Certificate of Deposit' }
            ]
          },
          {
            id: 'accountNumber',
            label: 'Account Number (last 4 digits)',
            type: 'text',
            placeholder: '****1234',
            required: true,
            validation: {
              pattern: '^\\*{0,}\\d{4}$',
              message: 'Please enter only the last 4 digits'
            }
          },
          {
            id: 'routingNumber',
            label: 'Routing Number',
            type: 'text',
            placeholder: '123456789',
            required: false
          },
          {
            id: 'onlineAccess',
            label: 'Online Banking URL',
            type: 'url',
            placeholder: 'https://www.chase.com',
            required: false
          }
        ],
        actions: [
          {
            id: 'create-bank-asset',
            type: 'create_asset',
            target: 'assets',
            data: {
              name: '{{bankName}} {{accountType}} Account',
              category: 'financial_accounts',
              type: 'bank_account',
              details: {
                bank: '{{bankName}}',
                accountType: '{{accountType}}',
                lastFour: '{{accountNumber}}',
                routing: '{{routingNumber}}',
                accessUrl: '{{onlineAccess}}'
              }
            },
            order: 1
          }
        ],
        preview: {
          items: [
            {
              type: 'asset',
              title: 'Bank Account Record',
              description: 'Secure documentation of account details'
            }
          ]
        },
        metadata: {
          author: 'System',
          version: '1.0.0',
          locale: 'en',
          isSystem: true,
          isPublic: true,
          usage: 0,
          rating: 4.7,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },

      // Digital Life Templates
      {
        id: 'social-media-accounts',
        categoryId: 'digital',
        name: 'Social Media Accounts',
        description: 'Document social media accounts with instructions for memorialization or closure',
        shortDescription: 'Social media account management',
        icon: '📱',
        tags: ['digital', 'social', 'accounts', 'online'],
        difficulty: 'beginner',
        timeEstimate: 20,
        fields: [
          {
            id: 'platform',
            label: 'Platform',
            type: 'select',
            required: true,
            options: [
              { value: 'facebook', label: 'Facebook' },
              { value: 'instagram', label: 'Instagram' },
              { value: 'twitter', label: 'Twitter/X' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'tiktok', label: 'TikTok' },
              { value: 'other', label: 'Other' }
            ]
          },
          {
            id: 'username',
            label: 'Username/Handle',
            type: 'text',
            placeholder: '@username',
            required: true
          },
          {
            id: 'email',
            label: 'Associated Email',
            type: 'email',
            placeholder: 'email@example.com',
            required: true
          },
          {
            id: 'instructions',
            label: 'Instructions',
            type: 'select',
            required: true,
            options: [
              { value: 'memorialize', label: 'Memorialize Account' },
              { value: 'delete', label: 'Delete Account' },
              { value: 'transfer', label: 'Transfer to Someone' },
              { value: 'maintain', label: 'Keep Active' }
            ]
          },
          {
            id: 'additionalNotes',
            label: 'Additional Instructions',
            type: 'textarea',
            placeholder: 'Any special requests or information...',
            required: false
          }
        ],
        actions: [
          {
            id: 'create-social-account',
            type: 'create_asset',
            target: 'assets',
            data: {
              name: '{{platform}} - {{username}}',
              category: 'online_accounts',
              type: 'social_media',
              details: {
                platform: '{{platform}}',
                username: '{{username}}',
                email: '{{email}}',
                instructions: '{{instructions}}',
                notes: '{{additionalNotes}}'
              }
            },
            order: 1
          },
          {
            id: 'create-instructions-doc',
            type: 'create_file',
            target: 'files',
            data: {
              name: '{{platform}} Account Instructions',
              content: `Platform: {{platform}}
Username: {{username}}
Email: {{email}}
Action Required: {{instructions}}

Additional Notes:
{{additionalNotes}}`,
              category: 'instructions'
            },
            order: 2
          }
        ],
        preview: {
          items: [
            {
              type: 'asset',
              title: 'Social Media Account',
              description: 'Account details and access info'
            },
            {
              type: 'file',
              title: 'Instructions Document',
              description: 'What to do with the account'
            }
          ]
        },
        metadata: {
          author: 'System',
          version: '1.0.0',
          locale: 'en',
          isSystem: true,
          isPublic: true,
          usage: 0,
          rating: 4.6,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    ]
  }

  /**
   * Get default scenarios
   */
  private getDefaultScenarios(): TemplateScenario[] {
    return [
      {
        id: 'quick-start',
        name: 'Quick Start Bundle',
        description: 'Essential setup for new users - covers the most critical information',
        templateIds: ['emergency-contacts', 'bank-accounts', 'farewell-messages'],
        order: 1,
        isRecommended: true
      },
      {
        id: 'comprehensive-family',
        name: 'Comprehensive Family Package',
        description: 'Complete setup for families including messages, contacts, and financial info',
        templateIds: ['emergency-contacts', 'farewell-messages', 'bank-accounts', 'social-media-accounts'],
        order: 2,
        isRecommended: true
      },
      {
        id: 'digital-native',
        name: 'Digital Life Management',
        description: 'For those with extensive online presence and digital assets',
        templateIds: ['social-media-accounts', 'emergency-contacts'],
        order: 3,
        isRecommended: false
      }
    ]
  }
}

export const templateLibraryService = TemplateLibraryService.getInstance()