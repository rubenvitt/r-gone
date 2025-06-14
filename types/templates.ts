// Template system types for digital legacy scenarios

export interface TemplateCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  order: number
}

export interface TemplateField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'email' | 'url' | 'date' | 'select' | 'multiselect' | 'boolean'
  placeholder?: string
  defaultValue?: any
  required: boolean
  options?: Array<{ value: string; label: string }>
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

export interface TemplateAction {
  id: string
  type: 'create_contact' | 'create_asset' | 'create_file' | 'create_message' | 'create_password' | 'configure_setting'
  target: string // Which component/service to interact with
  data: Record<string, any>
  order: number
}

export interface Template {
  id: string
  categoryId: string
  name: string
  description: string
  shortDescription: string
  icon: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  timeEstimate: number // minutes
  fields: TemplateField[]
  actions: TemplateAction[]
  preview?: {
    image?: string
    items: Array<{
      type: string
      title: string
      description: string
    }>
  }
  metadata: {
    author: string
    version: string
    locale: string
    isSystem: boolean
    isPublic: boolean
    usage: number
    rating: number
    createdAt: string
    updatedAt: string
  }
}

export interface TemplateScenario {
  id: string
  name: string
  description: string
  templateIds: string[]
  order: number
  isRecommended: boolean
}

export interface TemplateLibrary {
  categories: TemplateCategory[]
  templates: Template[]
  scenarios: TemplateScenario[]
}

export interface TemplateApplicationResult {
  success: boolean
  applied: Array<{
    templateId: string
    actions: Array<{
      actionId: string
      success: boolean
      result?: any
      error?: string
    }>
  }>
  summary: {
    total: number
    successful: number
    failed: number
    skipped: number
  }
}