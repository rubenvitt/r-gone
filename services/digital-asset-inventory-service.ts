'use client'

import { 
  DigitalAsset, 
  DigitalAssetInventory, 
  DigitalAssetType, 
  DigitalAssetCategory, 
  AssetTypeData,
  AssetFilter,
  AssetSearchResult,
  ImportanceLevel,
  AssetValue,
  AssetCost,
  AssetAlert,
  OnlineAccountData,
  DomainNameData,
  CryptocurrencyData,
  InvestmentAccountData,
  SubscriptionServiceData,
  SocialMediaData,
  CloudStorageData,
  DigitalCollectibleData,
  SoftwareLicenseData,
  APIKeyData,
  ServerData,
  DatabaseData,
  EmailAccountData,
  GenericAssetData
} from '@/types/data'

export interface AssetCreateOptions {
  type: DigitalAssetType
  category: DigitalAssetCategory
  name: string
  description?: string
  tags?: string[]
  importance?: ImportanceLevel
  assetData: AssetTypeData
  value?: AssetValue
  costs?: AssetCost
  expiryDate?: string
  renewalDate?: string
  autoRenew?: boolean
  username?: string
  email?: string
  accessUrl?: string
  accountNumber?: string
  customerId?: string
  twoFactorEnabled?: boolean
  securityNotes?: string
  notes?: string
}

export class DigitalAssetInventoryService {
  private static instance: DigitalAssetInventoryService
  
  public static getInstance(): DigitalAssetInventoryService {
    if (!DigitalAssetInventoryService.instance) {
      DigitalAssetInventoryService.instance = new DigitalAssetInventoryService()
    }
    return DigitalAssetInventoryService.instance
  }

  /**
   * Validate asset data
   */
  validateAsset(options: AssetCreateOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Required fields
    if (!options.name?.trim()) {
      errors.push('Asset name is required')
    }
    if (!options.type) {
      errors.push('Asset type is required')
    }
    if (!options.category) {
      errors.push('Asset category is required')
    }
    if (!options.assetData) {
      errors.push('Asset data is required')
    }

    // Validate type-specific data
    if (options.assetData) {
      const validationResult = this.validateAssetTypeData(options.assetData)
      if (!validationResult.isValid) {
        errors.push(...validationResult.errors)
      }
    }

    // Validate financial data
    if (options.value) {
      if (options.value.amount < 0) {
        errors.push('Asset value cannot be negative')
      }
      if (!options.value.currency) {
        errors.push('Currency is required for asset value')
      }
    }

    if (options.costs) {
      if (options.costs.amount < 0) {
        errors.push('Cost amount cannot be negative')
      }
      if (!options.costs.currency) {
        errors.push('Currency is required for costs')
      }
      if (options.costs.type === 'recurring' && !options.costs.frequency) {
        errors.push('Frequency is required for recurring costs')
      }
    }

    // Validate dates
    if (options.expiryDate) {
      const expiryDate = new Date(options.expiryDate)
      if (isNaN(expiryDate.getTime())) {
        errors.push('Invalid expiry date')
      }
    }

    if (options.renewalDate) {
      const renewalDate = new Date(options.renewalDate)
      if (isNaN(renewalDate.getTime())) {
        errors.push('Invalid renewal date')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate type-specific asset data
   */
  private validateAssetTypeData(data: AssetTypeData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    switch (data.type) {
      case 'domain_name':
        const domainData = data as DomainNameData
        if (!domainData.domainName) {
          errors.push('Domain name is required')
        }
        if (!domainData.registrar) {
          errors.push('Registrar is required')
        }
        if (!domainData.expiryDate) {
          errors.push('Domain expiry date is required')
        }
        break

      case 'cryptocurrency':
        const cryptoData = data as CryptocurrencyData
        if (!cryptoData.platform) {
          errors.push('Cryptocurrency platform is required')
        }
        if (!cryptoData.walletType) {
          errors.push('Wallet type is required')
        }
        break

      case 'investment_account':
        const investmentData = data as InvestmentAccountData
        if (!investmentData.provider) {
          errors.push('Investment provider is required')
        }
        if (!investmentData.accountType) {
          errors.push('Account type is required')
        }
        if (!investmentData.accountNumber) {
          errors.push('Account number is required')
        }
        break

      case 'subscription_service':
        const subscriptionData = data as SubscriptionServiceData
        if (!subscriptionData.serviceName) {
          errors.push('Service name is required')
        }
        if (!subscriptionData.plan) {
          errors.push('Subscription plan is required')
        }
        if (!subscriptionData.billingCycle) {
          errors.push('Billing cycle is required')
        }
        break

      case 'email_account':
        const emailData = data as EmailAccountData
        if (!emailData.emailAddress) {
          errors.push('Email address is required')
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (emailData.emailAddress && !emailRegex.test(emailData.emailAddress)) {
          errors.push('Invalid email address format')
        }
        if (!emailData.provider) {
          errors.push('Email provider is required')
        }
        break

      case 'api_key':
        const apiData = data as APIKeyData
        if (!apiData.service) {
          errors.push('API service name is required')
        }
        break

      case 'server':
        const serverData = data as ServerData
        if (!serverData.provider) {
          errors.push('Server provider is required')
        }
        if (!serverData.serverName) {
          errors.push('Server name is required')
        }
        break

      case 'database':
        const dbData = data as DatabaseData
        if (!dbData.provider) {
          errors.push('Database provider is required')
        }
        if (!dbData.databaseName) {
          errors.push('Database name is required')
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Create a new empty inventory
   */
  createEmptyInventory(): DigitalAssetInventory {
    return {
      assets: [],
      categories: ['financial', 'business', 'personal', 'entertainment', 'productivity', 'development', 'social', 'investment', 'infrastructure', 'other'],
      types: ['online_account', 'domain_name', 'website', 'cryptocurrency', 'investment_account', 'subscription_service', 'social_media', 'cloud_storage', 'digital_collectible', 'software_license', 'api_key', 'server', 'database', 'email_account', 'other'],
      settings: {
        defaultCategory: 'personal',
        defaultImportance: 'medium',
        enableValueTracking: true,
        enableExpiryMonitoring: true,
        expiryWarningDays: 30,
        enableAutoRenewal: false,
        currencyPreference: 'USD',
        groupRelatedAssets: true,
        securitySettings: {
          encryptSensitiveData: true,
          maskApiKeys: true,
          requireVerificationForView: false,
          auditAssetAccess: true
        },
        notifications: {
          expiryAlerts: true,
          valueChangeAlerts: true,
          securityAlerts: true,
          alertChannels: ['email']
        }
      },
      statistics: {
        totalAssets: 0,
        assetsByType: {} as Record<DigitalAssetType, number>,
        assetsByCategory: {} as Record<DigitalAssetCategory, number>,
        expiringAssets: 0,
        inactiveAssets: 0,
        criticalAssets: 0,
        lastAnalysis: new Date().toISOString()
      },
      alerts: []
    }
  }

  /**
   * Add a new asset
   */
  addAsset(inventory: DigitalAssetInventory, options: AssetCreateOptions): DigitalAssetInventory {
    // Validate asset data
    const validation = this.validateAsset(options)
    if (!validation.isValid) {
      throw new Error(`Invalid asset data: ${validation.errors.join(', ')}`)
    }

    const asset: DigitalAsset = {
      id: crypto.randomUUID(),
      type: options.type,
      category: options.category,
      name: options.name.trim(),
      description: options.description?.trim(),
      tags: options.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      importance: options.importance || inventory.settings.defaultImportance,
      assetData: options.assetData,
      value: options.value,
      costs: options.costs,
      expiryDate: options.expiryDate,
      renewalDate: options.renewalDate,
      autoRenew: options.autoRenew,
      username: options.username,
      email: options.email,
      accessUrl: options.accessUrl,
      accountNumber: options.accountNumber,
      customerId: options.customerId,
      twoFactorEnabled: options.twoFactorEnabled,
      securityNotes: options.securityNotes,
      notes: options.notes
    }

    const updatedInventory = {
      ...inventory,
      assets: [...inventory.assets, asset]
    }

    // Check for expiry alerts
    if (asset.expiryDate) {
      this.checkExpiryAlert(updatedInventory, asset)
    }

    return this.updateStatistics(updatedInventory)
  }

  /**
   * Update an existing asset
   */
  updateAsset(inventory: DigitalAssetInventory, assetId: string, updates: Partial<DigitalAsset>): DigitalAssetInventory {
    const assetIndex = inventory.assets.findIndex(a => a.id === assetId)
    if (assetIndex === -1) {
      throw new Error('Asset not found')
    }

    const currentAsset = inventory.assets[assetIndex]
    const updatedAsset: DigitalAsset = {
      ...currentAsset,
      ...updates,
      id: assetId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    }

    const updatedAssets = [...inventory.assets]
    updatedAssets[assetIndex] = updatedAsset

    const updatedInventory = {
      ...inventory,
      assets: updatedAssets
    }

    // Check for expiry alerts if expiry date changed
    if (updates.expiryDate !== undefined) {
      this.checkExpiryAlert(updatedInventory, updatedAsset)
    }

    // Check for value change alerts
    if (updates.value && currentAsset.value) {
      this.checkValueChangeAlert(updatedInventory, currentAsset, updatedAsset)
    }

    return this.updateStatistics(updatedInventory)
  }

  /**
   * Delete an asset
   */
  deleteAsset(inventory: DigitalAssetInventory, assetId: string): DigitalAssetInventory {
    const updatedInventory = {
      ...inventory,
      assets: inventory.assets.filter(a => a.id !== assetId),
      alerts: inventory.alerts.filter(alert => alert.assetId !== assetId)
    }

    return this.updateStatistics(updatedInventory)
  }

  /**
   * Search assets
   */
  searchAssets(inventory: DigitalAssetInventory, query: string): AssetSearchResult[] {
    if (!query.trim()) {
      return inventory.assets.map(asset => ({
        asset,
        relevanceScore: 1,
        matchedFields: [],
        highlights: []
      }))
    }

    const searchTerm = query.toLowerCase()
    const results: AssetSearchResult[] = []

    inventory.assets.forEach(asset => {
      let relevanceScore = 0
      const matchedFields: string[] = []
      const highlights: AssetSearchResult['highlights'] = []

      // Search in name
      if (asset.name.toLowerCase().includes(searchTerm)) {
        relevanceScore += 10
        matchedFields.push('name')
      }

      // Search in description
      if (asset.description?.toLowerCase().includes(searchTerm)) {
        relevanceScore += 5
        matchedFields.push('description')
      }

      // Search in tags
      if (asset.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) {
        relevanceScore += 4
        matchedFields.push('tags')
      }

      // Search in username
      if (asset.username?.toLowerCase().includes(searchTerm)) {
        relevanceScore += 7
        matchedFields.push('username')
      }

      // Search in email
      if (asset.email?.toLowerCase().includes(searchTerm)) {
        relevanceScore += 7
        matchedFields.push('email')
      }

      // Search in notes
      if (asset.notes?.toLowerCase().includes(searchTerm)) {
        relevanceScore += 3
        matchedFields.push('notes')
      }

      // Search in type-specific data
      const typeSearchScore = this.searchInAssetTypeData(asset.assetData, searchTerm)
      if (typeSearchScore > 0) {
        relevanceScore += typeSearchScore
        matchedFields.push('assetData')
      }

      if (relevanceScore > 0) {
        results.push({
          asset,
          relevanceScore,
          matchedFields,
          highlights
        })
      }
    })

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Search within type-specific asset data
   */
  private searchInAssetTypeData(data: AssetTypeData, searchTerm: string): number {
    let score = 0
    const search = (obj: any, weight: number = 1): void => {
      Object.values(obj).forEach(value => {
        if (typeof value === 'string' && value.toLowerCase().includes(searchTerm)) {
          score += weight
        } else if (typeof value === 'object' && value !== null) {
          search(value, weight * 0.5)
        }
      })
    }
    search(data, 5)
    return score
  }

  /**
   * Filter assets
   */
  filterAssets(inventory: DigitalAssetInventory, filter: AssetFilter): DigitalAsset[] {
    let assets = inventory.assets

    // Type filter
    if (filter.type && filter.type !== 'all') {
      assets = assets.filter(asset => asset.type === filter.type)
    }

    // Category filter
    if (filter.category && filter.category !== 'all') {
      assets = assets.filter(asset => asset.category === filter.category)
    }

    // Importance filter
    if (filter.importance && filter.importance !== 'all') {
      assets = assets.filter(asset => asset.importance === filter.importance)
    }

    // Active filter
    if (filter.isActive !== undefined) {
      assets = assets.filter(asset => asset.isActive === filter.isActive)
    }

    // Has value filter
    if (filter.hasValue !== undefined) {
      assets = assets.filter(asset => (asset.value !== undefined) === filter.hasValue)
    }

    // Expiring filter
    if (filter.expiringDays !== undefined) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() + filter.expiringDays)
      assets = assets.filter(asset => {
        if (!asset.expiryDate) return false
        const expiryDate = new Date(asset.expiryDate)
        return expiryDate <= cutoffDate && expiryDate >= new Date()
      })
    }

    // Search filter
    if (filter.search) {
      const searchResults = this.searchAssets(inventory, filter.search)
      const matchedIds = new Set(searchResults.map(r => r.asset.id))
      assets = assets.filter(asset => matchedIds.has(asset.id))
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      assets = assets.filter(asset =>
        asset.tags?.some(tag => filter.tags!.includes(tag))
      )
    }

    return assets
  }

  /**
   * Get assets by type
   */
  getAssetsByType(inventory: DigitalAssetInventory, type: DigitalAssetType): DigitalAsset[] {
    return inventory.assets.filter(asset => asset.type === type)
  }

  /**
   * Get assets by category
   */
  getAssetsByCategory(inventory: DigitalAssetInventory, category: DigitalAssetCategory): DigitalAsset[] {
    return inventory.assets.filter(asset => asset.category === category)
  }

  /**
   * Get expiring assets
   */
  getExpiringAssets(inventory: DigitalAssetInventory, days: number = 30): DigitalAsset[] {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() + days)
    
    return inventory.assets.filter(asset => {
      if (!asset.expiryDate) return false
      const expiryDate = new Date(asset.expiryDate)
      return expiryDate <= cutoffDate && expiryDate >= new Date()
    }).sort((a, b) => {
      const aDate = new Date(a.expiryDate!)
      const bDate = new Date(b.expiryDate!)
      return aDate.getTime() - bDate.getTime()
    })
  }

  /**
   * Calculate total asset value
   */
  calculateTotalValue(inventory: DigitalAssetInventory, currency: string = 'USD'): AssetValue {
    let total = 0
    const assets = inventory.assets.filter(asset => 
      asset.value && 
      asset.value.includeInTotal !== false &&
      asset.value.currency === currency
    )

    assets.forEach(asset => {
      if (asset.value) {
        total += asset.value.amount
      }
    })

    return {
      amount: total,
      currency,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Calculate recurring costs
   */
  calculateRecurringCosts(inventory: DigitalAssetInventory, currency: string = 'USD'): {
    monthly: AssetValue,
    yearly: AssetValue
  } {
    let monthlyTotal = 0
    let yearlyTotal = 0

    inventory.assets.forEach(asset => {
      if (asset.costs && asset.costs.type === 'recurring' && asset.costs.currency === currency) {
        const amount = asset.costs.amount
        
        switch (asset.costs.frequency) {
          case 'daily':
            monthlyTotal += amount * 30
            yearlyTotal += amount * 365
            break
          case 'weekly':
            monthlyTotal += amount * 4.33
            yearlyTotal += amount * 52
            break
          case 'monthly':
            monthlyTotal += amount
            yearlyTotal += amount * 12
            break
          case 'quarterly':
            monthlyTotal += amount / 3
            yearlyTotal += amount * 4
            break
          case 'yearly':
            monthlyTotal += amount / 12
            yearlyTotal += amount
            break
        }
      }
    })

    return {
      monthly: {
        amount: monthlyTotal,
        currency,
        lastUpdated: new Date().toISOString()
      },
      yearly: {
        amount: yearlyTotal,
        currency,
        lastUpdated: new Date().toISOString()
      }
    }
  }

  /**
   * Add related asset
   */
  addRelatedAsset(inventory: DigitalAssetInventory, assetId: string, relatedAssetId: string): DigitalAssetInventory {
    const assetIndex = inventory.assets.findIndex(a => a.id === assetId)
    const relatedAssetIndex = inventory.assets.findIndex(a => a.id === relatedAssetId)
    
    if (assetIndex === -1 || relatedAssetIndex === -1) {
      throw new Error('One or both assets not found')
    }

    if (assetId === relatedAssetId) {
      throw new Error('Cannot relate asset to itself')
    }

    const updatedAssets = [...inventory.assets]
    const asset = { ...updatedAssets[assetIndex] }
    
    if (!asset.relatedAssets) {
      asset.relatedAssets = []
    }

    if (!asset.relatedAssets.includes(relatedAssetId)) {
      asset.relatedAssets = [...asset.relatedAssets, relatedAssetId]
      asset.updatedAt = new Date().toISOString()
      updatedAssets[assetIndex] = asset
    }

    return {
      ...inventory,
      assets: updatedAssets
    }
  }

  /**
   * Check for expiry alerts
   */
  private checkExpiryAlert(inventory: DigitalAssetInventory, asset: DigitalAsset): void {
    if (!asset.expiryDate || !inventory.settings.enableExpiryMonitoring) return

    const expiryDate = new Date(asset.expiryDate)
    const today = new Date()
    const warningDate = new Date(expiryDate)
    warningDate.setDate(warningDate.getDate() - inventory.settings.expiryWarningDays)

    if (today >= warningDate && today < expiryDate) {
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      const alert: AssetAlert = {
        id: crypto.randomUUID(),
        assetId: asset.id,
        type: 'expiry',
        severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
        title: `${asset.name} expiring soon`,
        message: `This asset will expire in ${daysUntilExpiry} days on ${expiryDate.toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        actionRequired: true
      }

      // Remove existing expiry alert for this asset
      inventory.alerts = inventory.alerts.filter(a => 
        !(a.assetId === asset.id && a.type === 'expiry')
      )
      
      inventory.alerts.push(alert)
    }
  }

  /**
   * Check for value change alerts
   */
  private checkValueChangeAlert(inventory: DigitalAssetInventory, oldAsset: DigitalAsset, newAsset: DigitalAsset): void {
    if (!inventory.settings.notifications.valueChangeAlerts) return
    if (!oldAsset.value || !newAsset.value) return
    if (oldAsset.value.currency !== newAsset.value.currency) return

    const changePercent = ((newAsset.value.amount - oldAsset.value.amount) / oldAsset.value.amount) * 100
    
    if (Math.abs(changePercent) >= 10) { // Alert on 10% or more change
      const alert: AssetAlert = {
        id: crypto.randomUUID(),
        assetId: newAsset.id,
        type: 'value_change',
        severity: Math.abs(changePercent) >= 25 ? 'warning' : 'info',
        title: `${newAsset.name} value changed`,
        message: `Value ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}% from ${oldAsset.value.currency} ${oldAsset.value.amount} to ${newAsset.value.currency} ${newAsset.value.amount}`,
        createdAt: new Date().toISOString(),
        actionRequired: false
      }

      inventory.alerts.push(alert)
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(inventory: DigitalAssetInventory, alertId: string): DigitalAssetInventory {
    const alertIndex = inventory.alerts.findIndex(a => a.id === alertId)
    if (alertIndex === -1) {
      throw new Error('Alert not found')
    }

    const updatedAlerts = [...inventory.alerts]
    updatedAlerts[alertIndex] = {
      ...updatedAlerts[alertIndex],
      acknowledgedAt: new Date().toISOString()
    }

    return {
      ...inventory,
      alerts: updatedAlerts
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(inventory: DigitalAssetInventory, alertId: string): DigitalAssetInventory {
    const alertIndex = inventory.alerts.findIndex(a => a.id === alertId)
    if (alertIndex === -1) {
      throw new Error('Alert not found')
    }

    const updatedAlerts = [...inventory.alerts]
    updatedAlerts[alertIndex] = {
      ...updatedAlerts[alertIndex],
      resolvedAt: new Date().toISOString()
    }

    return {
      ...inventory,
      alerts: updatedAlerts
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(inventory: DigitalAssetInventory): AssetAlert[] {
    return inventory.alerts.filter(alert => !alert.resolvedAt)
  }

  /**
   * Export assets to CSV
   */
  exportToCSV(assets: DigitalAsset[]): string {
    const headers = [
      'Name',
      'Type',
      'Category',
      'Importance',
      'Username',
      'Email',
      'URL',
      'Value',
      'Currency',
      'Monthly Cost',
      'Expiry Date',
      'Tags',
      'Notes'
    ]

    const rows = assets.map(asset => {
      const monthlyCost = asset.costs?.type === 'recurring' && asset.costs.frequency === 'monthly' 
        ? asset.costs.amount 
        : ''
      
      return [
        asset.name,
        asset.type,
        asset.category,
        asset.importance,
        asset.username || '',
        asset.email || '',
        asset.accessUrl || '',
        asset.value?.amount || '',
        asset.value?.currency || '',
        monthlyCost,
        asset.expiryDate || '',
        asset.tags?.join('; ') || '',
        asset.notes || ''
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    return csv
  }

  /**
   * Export assets to JSON
   */
  exportToJSON(assets: DigitalAsset[]): string {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      assetCount: assets.length,
      assets: assets.map(asset => ({
        ...asset,
        // Exclude sensitive data unless explicitly included
        recoveryMethods: undefined,
        securityNotes: undefined
      }))
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Import assets from CSV
   */
  importFromCSV(csvContent: string, inventory: DigitalAssetInventory): { 
    imported: DigitalAsset[], 
    errors: string[] 
  } {
    const lines = csvContent.split('\n').filter(line => line.trim())
    const errors: string[] = []
    const imported: DigitalAsset[] = []
    
    if (lines.length < 2) {
      errors.push('CSV file must have headers and at least one data row')
      return { imported, errors }
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
    
    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i])
        
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`)
          continue
        }
        
        const rowData: any = {}
        headers.forEach((header, index) => {
          rowData[header] = values[index]
        })
        
        // Map CSV fields to asset structure
        const assetData: AssetCreateOptions = {
          name: rowData.name || `Imported Asset ${i}`,
          type: this.normalizeAssetType(rowData.type) || 'other',
          category: this.normalizeAssetCategory(rowData.category) || inventory.settings.defaultCategory,
          importance: this.normalizeImportanceLevel(rowData.importance) || inventory.settings.defaultImportance,
          username: rowData.username || undefined,
          email: rowData.email || undefined,
          accessUrl: rowData.url || rowData.accessurl || undefined,
          value: rowData.value && rowData.currency ? {
            amount: parseFloat(rowData.value) || 0,
            currency: rowData.currency,
            lastUpdated: new Date().toISOString()
          } : undefined,
          costs: rowData['monthly cost'] || rowData.monthlycost ? {
            type: 'recurring',
            amount: parseFloat(rowData['monthly cost'] || rowData.monthlycost) || 0,
            currency: rowData.currency || 'USD',
            frequency: 'monthly'
          } : undefined,
          expiryDate: this.parseDate(rowData['expiry date'] || rowData.expirydate),
          tags: rowData.tags ? rowData.tags.split(';').map((t: string) => t.trim()) : [],
          notes: rowData.notes || undefined,
          assetData: this.createDefaultAssetDataForType(this.normalizeAssetType(rowData.type) || 'other')
        }
        
        // Validate the asset
        const validation = this.validateAsset(assetData)
        if (!validation.isValid) {
          errors.push(`Row ${i + 1}: ${validation.errors.join(', ')}`)
          continue
        }
        
        // Create the asset
        const asset: DigitalAsset = {
          id: crypto.randomUUID(),
          type: assetData.type,
          category: assetData.category,
          name: assetData.name,
          description: assetData.description,
          tags: assetData.tags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          importance: assetData.importance!,
          assetData: assetData.assetData,
          value: assetData.value,
          costs: assetData.costs,
          expiryDate: assetData.expiryDate,
          username: assetData.username,
          email: assetData.email,
          accessUrl: assetData.accessUrl,
          notes: assetData.notes
        }
        
        imported.push(asset)
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    return { imported, errors }
  }

  /**
   * Import assets from JSON
   */
  importFromJSON(jsonContent: string, inventory: DigitalAssetInventory): { 
    imported: DigitalAsset[], 
    errors: string[] 
  } {
    const errors: string[] = []
    const imported: DigitalAsset[] = []
    
    try {
      const data = JSON.parse(jsonContent)
      
      if (!data.assets || !Array.isArray(data.assets)) {
        errors.push('Invalid JSON format: missing assets array')
        return { imported, errors }
      }
      
      data.assets.forEach((assetData: any, index: number) => {
        try {
          // Validate required fields
          if (!assetData.name || !assetData.type || !assetData.category) {
            errors.push(`Asset ${index + 1}: Missing required fields`)
            return
          }
          
          // Create asset with new ID
          const asset: DigitalAsset = {
            ...assetData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Ensure assetData is properly typed
            assetData: assetData.assetData || this.createDefaultAssetDataForType(assetData.type)
          }
          
          // Validate the asset
          const validation = this.validateAsset({
            type: asset.type,
            category: asset.category,
            name: asset.name,
            description: asset.description,
            tags: asset.tags,
            importance: asset.importance,
            assetData: asset.assetData,
            value: asset.value,
            costs: asset.costs,
            expiryDate: asset.expiryDate,
            username: asset.username,
            email: asset.email,
            accessUrl: asset.accessUrl,
            notes: asset.notes
          })
          
          if (!validation.isValid) {
            errors.push(`Asset ${index + 1} (${asset.name}): ${validation.errors.join(', ')}`)
            return
          }
          
          imported.push(asset)
        } catch (error) {
          errors.push(`Asset ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      })
    } catch (error) {
      errors.push(`JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return { imported, errors }
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = []
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
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(current.trim())
    return values
  }

  /**
   * Normalize asset type from string
   */
  private normalizeAssetType(type: string): DigitalAssetType | undefined {
    if (!type) return undefined
    
    const normalized = type.toLowerCase().replace(/\s+/g, '_')
    const validTypes: DigitalAssetType[] = [
      'online_account', 'domain_name', 'website', 'cryptocurrency',
      'investment_account', 'subscription_service', 'social_media',
      'cloud_storage', 'digital_collectible', 'software_license',
      'api_key', 'server', 'database', 'email_account', 'other'
    ]
    
    return validTypes.includes(normalized as DigitalAssetType) 
      ? normalized as DigitalAssetType 
      : undefined
  }

  /**
   * Normalize asset category from string
   */
  private normalizeAssetCategory(category: string): DigitalAssetCategory | undefined {
    if (!category) return undefined
    
    const normalized = category.toLowerCase()
    const validCategories: DigitalAssetCategory[] = [
      'financial', 'business', 'personal', 'entertainment',
      'productivity', 'development', 'social', 'investment',
      'infrastructure', 'other'
    ]
    
    return validCategories.includes(normalized as DigitalAssetCategory)
      ? normalized as DigitalAssetCategory
      : undefined
  }

  /**
   * Normalize importance level from string
   */
  private normalizeImportanceLevel(importance: string): ImportanceLevel | undefined {
    if (!importance) return undefined
    
    const normalized = importance.toLowerCase()
    const validLevels: ImportanceLevel[] = ['critical', 'high', 'medium', 'low']
    
    return validLevels.includes(normalized as ImportanceLevel)
      ? normalized as ImportanceLevel
      : undefined
  }

  /**
   * Parse date string
   */
  private parseDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined
    
    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    } catch {
      // Invalid date
    }
    
    return undefined
  }

  /**
   * Create default asset data for a given type
   */
  private createDefaultAssetDataForType(type: DigitalAssetType): AssetTypeData {
    switch (type) {
      case 'online_account':
        return { type: 'online_account', serviceName: '', accountStatus: 'active' }
      case 'domain_name':
        return { type: 'domain_name', domainName: '', registrar: '', registrationDate: '', expiryDate: '', autoRenew: false }
      case 'cryptocurrency':
        return { type: 'cryptocurrency', platform: '', walletType: 'exchange', holdings: [] }
      case 'investment_account':
        return { type: 'investment_account', provider: '', accountType: 'brokerage', accountNumber: '', holdings: [] }
      case 'subscription_service':
        return { type: 'subscription_service', serviceName: '', plan: '', billingCycle: 'monthly', startDate: new Date().toISOString() }
      case 'social_media':
        return { type: 'social_media', platform: '', username: '' }
      case 'cloud_storage':
        return { type: 'cloud_storage', provider: '', storageUsed: 0, storageLimit: 0 }
      case 'digital_collectible':
        return { type: 'digital_collectible', platform: '' }
      case 'software_license':
        return { type: 'software_license', software: '', licenseType: 'perpetual' }
      case 'api_key':
        return { type: 'api_key', service: '' }
      case 'server':
        return { type: 'server', provider: '', serverName: '' }
      case 'database':
        return { type: 'database', provider: '', databaseType: '', databaseName: '' }
      case 'email_account':
        return { type: 'email_account', emailAddress: '', provider: '', accountType: 'personal' }
      default:
        return { type: 'other' }
    }
  }

  /**
   * Update inventory statistics
   */
  private updateStatistics(inventory: DigitalAssetInventory): DigitalAssetInventory {
    const stats = {
      totalAssets: inventory.assets.length,
      assetsByType: {} as Record<DigitalAssetType, number>,
      assetsByCategory: {} as Record<DigitalAssetCategory, number>,
      totalValue: this.calculateTotalValue(inventory, inventory.settings.currencyPreference),
      monthlyRecurringCost: this.calculateRecurringCosts(inventory, inventory.settings.currencyPreference).monthly,
      yearlyRecurringCost: this.calculateRecurringCosts(inventory, inventory.settings.currencyPreference).yearly,
      expiringAssets: 0,
      inactiveAssets: 0,
      criticalAssets: 0,
      lastAnalysis: new Date().toISOString()
    }

    // Initialize counts
    inventory.types.forEach(type => {
      stats.assetsByType[type] = 0
    })
    inventory.categories.forEach(category => {
      stats.assetsByCategory[category] = 0
    })

    // Count assets
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    inventory.assets.forEach(asset => {
      stats.assetsByType[asset.type]++
      stats.assetsByCategory[asset.category]++
      
      if (!asset.isActive) {
        stats.inactiveAssets++
      }
      
      if (asset.importance === 'critical') {
        stats.criticalAssets++
      }
      
      if (asset.expiryDate) {
        const expiryDate = new Date(asset.expiryDate)
        if (expiryDate <= thirtyDaysFromNow) {
          stats.expiringAssets++
        }
      }
    })

    return {
      ...inventory,
      statistics: stats
    }
  }
}

// Export singleton instance
export const digitalAssetInventoryService = DigitalAssetInventoryService.getInstance()