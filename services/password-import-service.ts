import { PasswordEntry, PasswordVault, PasswordCategory } from '@/types/data'
import { passwordVaultService } from './password-vault-service'

export type ImportSource = 'lastpass' | 'bitwarden' | 'onepassword' | 'chrome' | 'firefox' | 'generic-csv'

interface ImportPreview {
  totalEntries: number
  validEntries: number
  duplicates: number
  errors: string[]
  entries: PasswordEntry[]
}

interface CSVRow {
  [key: string]: string
}

class PasswordImportService {
  private static instance: PasswordImportService

  public static getInstance(): PasswordImportService {
    if (!PasswordImportService.instance) {
      PasswordImportService.instance = new PasswordImportService()
    }
    return PasswordImportService.instance
  }

  /**
   * Parse an import file based on the source type
   */
  async parseFile(
    fileContent: string,
    source: ImportSource,
    fileName: string,
    currentVault: PasswordVault
  ): Promise<ImportPreview> {
    // Determine file type
    const isJSON = fileName.endsWith('.json') || this.isValidJSON(fileContent)
    
    if (isJSON && source === 'bitwarden') {
      return this.parseBitwardenJSON(fileContent, currentVault)
    } else {
      return this.parseCSV(fileContent, source, currentVault)
    }
  }

  /**
   * Parse CSV file based on source format
   */
  private parseCSV(
    content: string,
    source: ImportSource,
    currentVault: PasswordVault
  ): ImportPreview {
    const lines = content.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid')
    }

    // Parse CSV header and rows
    const parsed = this.parseCSVContent(lines)
    const { headers, rows } = parsed

    // Map fields based on source
    const fieldMapping = this.getFieldMapping(source, headers)
    
    const entries: PasswordEntry[] = []
    const errors: string[] = []
    let duplicates = 0

    rows.forEach((row, index) => {
      try {
        const entry = this.mapRowToEntry(row, fieldMapping, source)
        
        // Check for duplicates
        const isDuplicate = currentVault.entries.some(
          existing => 
            existing.serviceName === entry.serviceName &&
            existing.username === entry.username
        )
        
        if (isDuplicate) {
          duplicates++
        }
        
        entries.push(entry)
      } catch (error) {
        errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`)
      }
    })

    return {
      totalEntries: rows.length,
      validEntries: entries.length,
      duplicates,
      errors,
      entries
    }
  }

  /**
   * Parse Bitwarden JSON export
   */
  private parseBitwardenJSON(
    content: string,
    currentVault: PasswordVault
  ): ImportPreview {
    let data: unknown
    try {
      data = JSON.parse(content)
    } catch {
      throw new Error('Invalid JSON file')
    }

    const entries: PasswordEntry[] = []
    const errors: string[] = []
    let duplicates = 0

    const parsedData = data as { items?: any[] }
    const items = parsedData.items || []
    
    items.forEach((item: any, index: number) => {
      try {
        if (item.type === 1) { // Login type
          const entry: PasswordEntry = {
            id: crypto.randomUUID(),
            serviceName: item.name || 'Untitled',
            username: item.login?.username || '',
            email: item.login?.username?.includes('@') ? item.login.username : undefined,
            password: item.login?.password || '',
            url: item.login?.uris?.[0]?.uri || '',
            notes: item.notes || '',
            category: this.inferCategory(item.name, item.login?.uris?.[0]?.uri),
            tags: item.collectionIds || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            strength: passwordVaultService.analyzePasswordStrength(item.login?.password || '')
          }

          // Check for duplicates
          const isDuplicate = currentVault.entries.some(
            existing => 
              existing.serviceName === entry.serviceName &&
              existing.username === entry.username
          )
          
          if (isDuplicate) {
            duplicates++
          }
          
          entries.push(entry)
        }
      } catch (error) {
        errors.push(`Item ${index + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`)
      }
    })

    return {
      totalEntries: items.length,
      validEntries: entries.length,
      duplicates,
      errors,
      entries
    }
  }

  /**
   * Parse CSV content into headers and rows
   */
  private parseCSVContent(lines: string[]): { headers: string[], rows: CSVRow[] } {
    const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
    const rows: CSVRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i])
      if (values.length > 0) {
        const row: CSVRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        rows.push(row)
      }
    }

    return { headers, rows }
  }

  /**
   * Parse a single CSV line handling quotes and commas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  /**
   * Get field mapping based on source and headers
   */
  private getFieldMapping(source: ImportSource, headers: string[]): Record<string, string> {
    const mappings: Record<ImportSource, Record<string, string[]>> = {
      'lastpass': {
        name: ['name', 'site', 'url'],
        username: ['username', 'login', 'email'],
        password: ['password', 'pass'],
        url: ['url', 'uri', 'website'],
        notes: ['notes', 'extra', 'comments']
      },
      'bitwarden': {
        name: ['name', 'title'],
        username: ['login_username', 'username'],
        password: ['login_password', 'password'],
        url: ['login_uri', 'uri', 'url'],
        notes: ['notes']
      },
      'onepassword': {
        name: ['title', 'name'],
        username: ['username', 'email'],
        password: ['password'],
        url: ['url', 'website'],
        notes: ['notes', 'notesplain']
      },
      'chrome': {
        name: ['name', 'title'],
        username: ['username'],
        password: ['password'],
        url: ['url', 'uri'],
        notes: ['note']
      },
      'firefox': {
        name: ['hostname', 'title'],
        username: ['username'],
        password: ['password'],
        url: ['hostname', 'url'],
        notes: ['']
      },
      'generic-csv': {
        name: ['name', 'title', 'service', 'site'],
        username: ['username', 'user', 'login', 'email'],
        password: ['password', 'pass'],
        url: ['url', 'uri', 'website', 'site'],
        notes: ['notes', 'note', 'description', 'comments']
      }
    }

    const sourceMapping = mappings[source] || mappings['generic-csv']
    const fieldMap: Record<string, string> = {}

    // Find matching headers for each field
    Object.entries(sourceMapping).forEach(([field, possibleHeaders]) => {
      const matchingHeader = headers.find(h => 
        possibleHeaders.includes(h.toLowerCase())
      )
      if (matchingHeader) {
        fieldMap[field] = matchingHeader
      }
    })

    return fieldMap
  }

  /**
   * Map a CSV row to a PasswordEntry
   */
  private mapRowToEntry(
    row: CSVRow,
    fieldMapping: Record<string, string>,
    source: ImportSource
  ): PasswordEntry {
    const getValue = (field: string): string => {
      const header = fieldMapping[field]
      return header ? row[header] || '' : ''
    }

    const name = getValue('name')
    const username = getValue('username')
    const password = getValue('password')
    const url = getValue('url')
    const notes = getValue('notes')

    if (!name && !url) {
      throw new Error('Entry must have a name or URL')
    }

    if (!password) {
      throw new Error('Entry must have a password')
    }

    return {
      id: crypto.randomUUID(),
      serviceName: name || this.extractNameFromURL(url) || 'Untitled',
      username: username,
      email: username.includes('@') ? username : undefined,
      password: password,
      url: url,
      notes: notes,
      category: this.inferCategory(name, url),
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      strength: passwordVaultService.analyzePasswordStrength(password)
    }
  }

  /**
   * Extract a service name from URL
   */
  private extractNameFromURL(url: string): string {
    if (!url) return ''
    
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      const hostname = urlObj.hostname
      
      // Remove common prefixes
      const cleanHost = hostname.replace(/^(www\.|m\.|app\.)/, '')
      
      // Extract domain name
      const parts = cleanHost.split('.')
      if (parts.length >= 2) {
        return parts[parts.length - 2]
      }
      
      return cleanHost
    } catch {
      return url.split('/')[0]
    }
  }

  /**
   * Infer category based on service name or URL
   */
  private inferCategory(name: string, url: string): PasswordCategory {
    const text = `${name} ${url}`.toLowerCase()
    
    const categoryPatterns: Record<PasswordCategory, string[]> = {
      'financial': ['bank', 'credit', 'paypal', 'venmo', 'crypto', 'invest', 'finance', 'money'],
      'social': ['facebook', 'twitter', 'instagram', 'linkedin', 'reddit', 'social'],
      'shopping': ['amazon', 'ebay', 'etsy', 'shop', 'store', 'market'],
      'entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'youtube', 'game', 'steam'],
      'business': ['slack', 'zoom', 'teams', 'office', 'work', 'company'],
      'education': ['school', 'university', 'edu', 'learn', 'course'],
      'healthcare': ['health', 'medical', 'doctor', 'hospital', 'pharmacy'],
      'utilities': ['electric', 'gas', 'water', 'internet', 'phone', 'utility'],
      'personal': ['email', 'gmail', 'outlook', 'apple', 'microsoft', 'google'],
      'other': []
    }

    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        return category as PasswordCategory
      }
    }

    return 'other'
  }

  /**
   * Check if content is valid JSON
   */
  private isValidJSON(content: string): boolean {
    try {
      JSON.parse(content)
      return true
    } catch {
      return false
    }
  }

  /**
   * Import entries into the vault
   */
  async importEntries(
    vault: PasswordVault,
    entries: PasswordEntry[],
    options: {
      skipDuplicates: boolean
      updateExisting: boolean
    } = { skipDuplicates: true, updateExisting: false }
  ): Promise<PasswordVault> {
    let updatedVault = { ...vault }

    for (const entry of entries) {
      const existingIndex = updatedVault.entries.findIndex(
        e => e.serviceName === entry.serviceName && e.username === entry.username
      )

      if (existingIndex >= 0) {
        if (options.skipDuplicates) {
          continue
        } else if (options.updateExisting) {
          updatedVault.entries[existingIndex] = {
            ...updatedVault.entries[existingIndex],
            ...entry,
            id: updatedVault.entries[existingIndex].id, // Keep original ID
            createdAt: updatedVault.entries[existingIndex].createdAt // Keep original creation date
          }
        }
      } else {
        updatedVault = passwordVaultService.addEntry(updatedVault, entry)
      }
    }

    return updatedVault
  }
}

export const passwordImportService = PasswordImportService.getInstance()