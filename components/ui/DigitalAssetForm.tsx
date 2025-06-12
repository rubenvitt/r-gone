'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  X, 
  Save, 
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  DollarSign,
  Shield,
  Link,
  Key,
  Globe,
  Server,
  Database,
  Mail,
  CreditCard,
  Cloud,
  Package,
  Users,
  Star,
  Code,
  HardDrive,
  Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DigitalAsset, 
  DigitalAssetInventory,
  DigitalAssetType,
  DigitalAssetCategory,
  ImportanceLevel,
  AssetValue,
  AssetCost,
  AssetTypeData,
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
  GenericAssetData,
  CustomField,
  RecoveryMethod,
  CryptoHolding,
  InvestmentHolding
} from '@/types/data'
import { digitalAssetInventoryService } from '@/services/digital-asset-inventory-service'

interface DigitalAssetFormProps {
  asset?: DigitalAsset
  inventory: DigitalAssetInventory
  onSave: (assetData: Partial<DigitalAsset>) => void
  onCancel: () => void
}

export default function DigitalAssetForm({ 
  asset, 
  inventory, 
  onSave, 
  onCancel 
}: DigitalAssetFormProps) {
  // Basic fields
  const [name, setName] = useState(asset?.name || '')
  const [type, setType] = useState<DigitalAssetType>(asset?.type || 'online_account')
  const [category, setCategory] = useState<DigitalAssetCategory>(asset?.category || inventory.settings.defaultCategory)
  const [description, setDescription] = useState(asset?.description || '')
  const [tags, setTags] = useState<string[]>(asset?.tags || [])
  const [importance, setImportance] = useState<ImportanceLevel>(asset?.importance || inventory.settings.defaultImportance)
  
  // Access information
  const [accessUrl, setAccessUrl] = useState(asset?.accessUrl || '')
  const [username, setUsername] = useState(asset?.username || '')
  const [email, setEmail] = useState(asset?.email || '')
  const [accountNumber, setAccountNumber] = useState(asset?.accountNumber || '')
  const [customerId, setCustomerId] = useState(asset?.customerId || '')
  
  // Financial information
  const [hasValue, setHasValue] = useState(!!asset?.value)
  const [value, setValue] = useState<AssetValue>(asset?.value || {
    amount: 0,
    currency: inventory.settings.currencyPreference,
    lastUpdated: new Date().toISOString()
  })
  const [hasCost, setHasCost] = useState(!!asset?.costs)
  const [costs, setCosts] = useState<AssetCost>(asset?.costs || {
    type: 'recurring',
    amount: 0,
    currency: inventory.settings.currencyPreference,
    frequency: 'monthly'
  })
  
  // Lifecycle
  const [expiryDate, setExpiryDate] = useState(asset?.expiryDate || '')
  const [renewalDate, setRenewalDate] = useState(asset?.renewalDate || '')
  const [autoRenew, setAutoRenew] = useState(asset?.autoRenew || false)
  
  // Security
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(asset?.twoFactorEnabled || false)
  const [securityNotes, setSecurityNotes] = useState(asset?.securityNotes || '')
  const [recoveryMethods, setRecoveryMethods] = useState<RecoveryMethod[]>(asset?.recoveryMethods || [])
  
  // Notes and custom fields
  const [notes, setNotes] = useState(asset?.notes || '')
  const [customFields, setCustomFields] = useState<CustomField[]>(asset?.customFields || [])
  
  // Type-specific data
  const [assetData, setAssetData] = useState<AssetTypeData>(
    asset?.assetData || createDefaultAssetData(type)
  )
  
  // UI state
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  
  // Create default asset data based on type
  function createDefaultAssetData(assetType: DigitalAssetType): AssetTypeData {
    switch (assetType) {
      case 'online_account':
        return { type: 'online_account', serviceName: '', accountStatus: 'active' }
      case 'domain_name':
        return { 
          type: 'domain_name', 
          domainName: '', 
          registrar: '', 
          registrationDate: '', 
          expiryDate: '', 
          autoRenew: false 
        }
      case 'cryptocurrency':
        return { 
          type: 'cryptocurrency', 
          platform: '', 
          walletType: 'exchange', 
          holdings: [] 
        }
      case 'investment_account':
        return { 
          type: 'investment_account', 
          provider: '', 
          accountType: 'brokerage', 
          accountNumber: '', 
          holdings: [] 
        }
      case 'subscription_service':
        return { 
          type: 'subscription_service', 
          serviceName: '', 
          plan: '', 
          billingCycle: 'monthly', 
          startDate: new Date().toISOString().split('T')[0] 
        }
      case 'social_media':
        return { 
          type: 'social_media', 
          platform: '', 
          username: '' 
        }
      case 'cloud_storage':
        return { 
          type: 'cloud_storage', 
          provider: '', 
          storageUsed: 0, 
          storageLimit: 0 
        }
      case 'digital_collectible':
        return { 
          type: 'digital_collectible', 
          platform: '' 
        }
      case 'software_license':
        return { 
          type: 'software_license', 
          software: '', 
          licenseType: 'perpetual' 
        }
      case 'api_key':
        return { 
          type: 'api_key', 
          service: '' 
        }
      case 'server':
        return { 
          type: 'server', 
          provider: '', 
          serverName: '' 
        }
      case 'database':
        return { 
          type: 'database', 
          provider: '', 
          databaseType: '', 
          databaseName: '' 
        }
      case 'email_account':
        return { 
          type: 'email_account', 
          emailAddress: '', 
          provider: '', 
          accountType: 'personal' 
        }
      default:
        return { type: 'other' }
    }
  }
  
  // Update asset data when type changes
  useEffect(() => {
    if (!asset || asset.type !== type) {
      setAssetData(createDefaultAssetData(type))
    }
  }, [type, asset])
  
  // Add tag
  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }, [newTag, tags])
  
  // Remove tag
  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }, [tags])
  
  // Add recovery method
  const handleAddRecoveryMethod = useCallback(() => {
    setRecoveryMethods([...recoveryMethods, {
      type: 'email',
      value: '',
      notes: ''
    }])
  }, [recoveryMethods])
  
  // Update recovery method
  const handleUpdateRecoveryMethod = useCallback((index: number, updates: Partial<RecoveryMethod>) => {
    const updated = [...recoveryMethods]
    updated[index] = { ...updated[index], ...updates }
    setRecoveryMethods(updated)
  }, [recoveryMethods])
  
  // Remove recovery method
  const handleRemoveRecoveryMethod = useCallback((index: number) => {
    setRecoveryMethods(recoveryMethods.filter((_, i) => i !== index))
  }, [recoveryMethods])
  
  // Add custom field
  const handleAddCustomField = useCallback(() => {
    setCustomFields([...customFields, {
      id: crypto.randomUUID(),
      label: '',
      value: '',
      type: 'text',
      isSecret: false
    }])
  }, [customFields])
  
  // Update custom field
  const handleUpdateCustomField = useCallback((index: number, updates: Partial<CustomField>) => {
    const updated = [...customFields]
    updated[index] = { ...updated[index], ...updates }
    setCustomFields(updated)
  }, [customFields])
  
  // Remove custom field
  const handleRemoveCustomField = useCallback((index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }, [customFields])
  
  // Validate and save
  const handleSave = useCallback(() => {
    const validation = digitalAssetInventoryService.validateAsset({
      type,
      category,
      name,
      description,
      tags,
      importance,
      assetData,
      value: hasValue ? value : undefined,
      costs: hasCost ? costs : undefined,
      expiryDate: expiryDate || undefined,
      renewalDate: renewalDate || undefined,
      autoRenew,
      username: username || undefined,
      email: email || undefined,
      accessUrl: accessUrl || undefined,
      accountNumber: accountNumber || undefined,
      customerId: customerId || undefined,
      twoFactorEnabled,
      securityNotes: securityNotes || undefined,
      notes: notes || undefined
    })
    
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }
    
    onSave({
      type,
      category,
      name,
      description: description || undefined,
      tags,
      importance,
      assetData,
      value: hasValue ? value : undefined,
      costs: hasCost ? costs : undefined,
      expiryDate: expiryDate || undefined,
      renewalDate: renewalDate || undefined,
      autoRenew,
      username: username || undefined,
      email: email || undefined,
      accessUrl: accessUrl || undefined,
      accountNumber: accountNumber || undefined,
      customerId: customerId || undefined,
      twoFactorEnabled,
      recoveryMethods: recoveryMethods.length > 0 ? recoveryMethods : undefined,
      securityNotes: securityNotes || undefined,
      notes: notes || undefined,
      customFields: customFields.length > 0 ? customFields : undefined
    })
  }, [
    type, category, name, description, tags, importance, assetData,
    hasValue, value, hasCost, costs, expiryDate, renewalDate, autoRenew,
    username, email, accessUrl, accountNumber, customerId,
    twoFactorEnabled, recoveryMethods, securityNotes, notes, customFields,
    onSave
  ])
  
  // Get icon for asset type
  const getTypeIcon = useCallback((assetType: DigitalAssetType) => {
    const iconMap = {
      online_account: Globe,
      domain_name: Globe,
      website: Globe,
      cryptocurrency: CreditCard,
      investment_account: DollarSign,
      subscription_service: Package,
      social_media: Users,
      cloud_storage: Cloud,
      digital_collectible: Star,
      software_license: Key,
      api_key: Code,
      server: Server,
      database: Database,
      email_account: Mail,
      other: HardDrive
    }
    return iconMap[assetType] || HardDrive
  }, [])
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {asset ? 'Edit Digital Asset' : 'Add Digital Asset'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Errors */}
        {errors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-900">Please fix the following errors:</h4>
                <ul className="mt-2 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Form */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              {/* Asset Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as DigitalAssetType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!asset}
                  >
                    {inventory.types.map(t => (
                      <option key={t} value={t}>
                        {t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DigitalAssetCategory)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {inventory.categories.map(c => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Name and Importance */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., PayPal Account, example.com, Bitcoin Wallet"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importance
                  </label>
                  <select
                    value={importance}
                    onChange={(e) => setImportance(e.target.value as ImportanceLevel)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of this asset"
                />
              </div>
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a tag"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTag}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Type-Specific Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Asset Details</h3>
              {renderTypeSpecificFields()}
            </div>
            
            {/* Access Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Access Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {(type !== 'email_account' || assetData.type !== 'email_account') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                {(type !== 'email_account' || assetData.type !== 'email_account') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access URL
                  </label>
                  <input
                    type="url"
                    value={accessUrl}
                    onChange={(e) => setAccessUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer ID
                </label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Financial Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Financial Information</h3>
              
              {/* Asset Value */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={hasValue}
                    onChange={(e) => setHasValue(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">This asset has a monetary value</span>
                </label>
                
                {hasValue && (
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Value
                      </label>
                      <input
                        type="number"
                        value={value.amount}
                        onChange={(e) => setValue({ ...value, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={value.currency}
                        onChange={(e) => setValue({ ...value, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                        <option value="JPY">JPY</option>
                        <option value="CHF">CHF</option>
                        <option value="CNY">CNY</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Costs */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={hasCost}
                    onChange={(e) => setHasCost(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">This asset has associated costs</span>
                </label>
                
                {hasCost && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cost Type
                        </label>
                        <select
                          value={costs.type}
                          onChange={(e) => setCosts({ ...costs, type: e.target.value as 'one_time' | 'recurring' | 'usage_based' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="one_time">One Time</option>
                          <option value="recurring">Recurring</option>
                          <option value="usage_based">Usage Based</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          value={costs.amount}
                          onChange={(e) => setCosts({ ...costs, amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Currency
                        </label>
                        <select
                          value={costs.currency}
                          onChange={(e) => setCosts({ ...costs, currency: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="CAD">CAD</option>
                          <option value="AUD">AUD</option>
                          <option value="JPY">JPY</option>
                          <option value="CHF">CHF</option>
                          <option value="CNY">CNY</option>
                        </select>
                      </div>
                    </div>
                    
                    {costs.type === 'recurring' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <select
                          value={costs.frequency}
                          onChange={(e) => setCosts({ ...costs, frequency: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Lifecycle Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Lifecycle Management</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Auto-renewal enabled</span>
              </label>
            </div>
            
            {/* Security */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Security</h3>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Two-factor authentication enabled</span>
              </label>
              
              {/* Recovery Methods */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Recovery Methods
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRecoveryMethod}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Method
                  </Button>
                </div>
                
                {recoveryMethods.length > 0 && (
                  <div className="space-y-2">
                    {recoveryMethods.map((method, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <select
                            value={method.type}
                            onChange={(e) => handleUpdateRecoveryMethod(index, { type: e.target.value as any })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="security_questions">Security Questions</option>
                            <option value="recovery_codes">Recovery Codes</option>
                            <option value="authenticator">Authenticator App</option>
                            <option value="hardware_key">Hardware Key</option>
                            <option value="other">Other</option>
                          </select>
                          <input
                            type="text"
                            value={method.value || ''}
                            onChange={(e) => handleUpdateRecoveryMethod(index, { value: e.target.value })}
                            placeholder="Value/Details"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={method.notes || ''}
                            onChange={(e) => handleUpdateRecoveryMethod(index, { notes: e.target.value })}
                            placeholder="Notes"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRecoveryMethod(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Notes
                </label>
                <textarea
                  value={securityNotes}
                  onChange={(e) => setSecurityNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any security-related notes or considerations"
                />
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional notes about this asset"
                />
              </div>
              
              {/* Custom Fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Custom Fields
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomField}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
                
                {customFields.length > 0 && (
                  <div className="space-y-2">
                    {customFields.map((field, index) => (
                      <div key={field.id} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleUpdateCustomField(index, { label: e.target.value })}
                            placeholder="Field name"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="relative">
                            <input
                              type={field.isSecret && !showPassword ? 'password' : 'text'}
                              value={field.value}
                              onChange={(e) => handleUpdateCustomField(index, { value: e.target.value })}
                              placeholder="Value"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {field.isSecret && (
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="flex items-center space-x-1">
                              <input
                                type="checkbox"
                                checked={field.isSecret}
                                onChange={(e) => handleUpdateCustomField(index, { isSecret: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-600">Secret</span>
                            </label>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCustomField(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {asset ? 'Update' : 'Add'} Asset
          </Button>
        </div>
      </div>
    </div>
  )
  
  // Render type-specific fields based on asset type
  function renderTypeSpecificFields() {
    switch (type) {
      case 'online_account':
        return renderOnlineAccountFields()
      case 'domain_name':
        return renderDomainNameFields()
      case 'cryptocurrency':
        return renderCryptocurrencyFields()
      case 'investment_account':
        return renderInvestmentAccountFields()
      case 'subscription_service':
        return renderSubscriptionServiceFields()
      case 'social_media':
        return renderSocialMediaFields()
      case 'cloud_storage':
        return renderCloudStorageFields()
      case 'digital_collectible':
        return renderDigitalCollectibleFields()
      case 'software_license':
        return renderSoftwareLicenseFields()
      case 'api_key':
        return renderAPIKeyFields()
      case 'server':
        return renderServerFields()
      case 'database':
        return renderDatabaseFields()
      case 'email_account':
        return renderEmailAccountFields()
      default:
        return renderGenericFields()
    }
  }
  
  // Render functions for each asset type
  function renderOnlineAccountFields() {
    const data = assetData as OnlineAccountData
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Name
          </label>
          <input
            type="text"
            value={data.serviceName}
            onChange={(e) => setAssetData({ ...data, serviceName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., PayPal, Amazon, Netflix"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Status
          </label>
          <select
            value={data.accountStatus}
            onChange={(e) => setAssetData({ ...data, accountStatus: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
    )
  }
  
  function renderDomainNameFields() {
    const data = assetData as DomainNameData
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain Name
            </label>
            <input
              type="text"
              value={data.domainName}
              onChange={(e) => setAssetData({ ...data, domainName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registrar
            </label>
            <input
              type="text"
              value={data.registrar}
              onChange={(e) => setAssetData({ ...data, registrar: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., GoDaddy, Namecheap"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Date
            </label>
            <input
              type="date"
              value={data.registrationDate}
              onChange={(e) => setAssetData({ ...data, registrationDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              value={data.expiryDate}
              onChange={(e) => {
                setAssetData({ ...data, expiryDate: e.target.value })
                setExpiryDate(e.target.value) // Also update main expiry date
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DNS Provider
          </label>
          <input
            type="text"
            value={data.dnsProvider || ''}
            onChange={(e) => setAssetData({ ...data, dnsProvider: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Cloudflare, Route53"
          />
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.autoRenew}
              onChange={(e) => {
                setAssetData({ ...data, autoRenew: e.target.checked })
                setAutoRenew(e.target.checked) // Also update main auto-renew
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Auto-renewal enabled</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.privacyProtection || false}
              onChange={(e) => setAssetData({ ...data, privacyProtection: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Privacy protection</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.transferLock || false}
              onChange={(e) => setAssetData({ ...data, transferLock: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Transfer lock</span>
          </label>
        </div>
      </div>
    )
  }
  
  function renderCryptocurrencyFields() {
    const data = assetData as CryptocurrencyData
    
    const addHolding = () => {
      setAssetData({
        ...data,
        holdings: [...(data.holdings || []), {
          symbol: '',
          name: '',
          amount: 0,
          lastUpdated: new Date().toISOString()
        }]
      })
    }
    
    const updateHolding = (index: number, updates: Partial<CryptoHolding>) => {
      const holdings = [...(data.holdings || [])]
      holdings[index] = { ...holdings[index], ...updates }
      setAssetData({ ...data, holdings })
    }
    
    const removeHolding = (index: number) => {
      setAssetData({
        ...data,
        holdings: (data.holdings || []).filter((_, i) => i !== index)
      })
    }
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform/Exchange
            </label>
            <input
              type="text"
              value={data.platform}
              onChange={(e) => setAssetData({ ...data, platform: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Coinbase, Binance, MetaMask"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wallet Type
            </label>
            <select
              value={data.walletType}
              onChange={(e) => setAssetData({ ...data, walletType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="exchange">Exchange Wallet</option>
              <option value="hot_wallet">Hot Wallet</option>
              <option value="cold_wallet">Cold Wallet</option>
              <option value="hardware_wallet">Hardware Wallet</option>
            </select>
          </div>
        </div>
        
        {data.walletType === 'hardware_wallet' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hardware Device
            </label>
            <input
              type="text"
              value={data.hardwareDevice || ''}
              onChange={(e) => setAssetData({ ...data, hardwareDevice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Ledger Nano X, Trezor Model T"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Wallet Address (Public)
          </label>
          <input
            type="text"
            value={data.walletAddress || ''}
            onChange={(e) => setAssetData({ ...data, walletAddress: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="0x..."
          />
        </div>
        
        {/* Holdings */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Holdings
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addHolding}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Holding
            </Button>
          </div>
          
          {data.holdings && data.holdings.length > 0 && (
            <div className="space-y-2">
              {data.holdings.map((holding, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={holding.symbol}
                      onChange={(e) => updateHolding(index, { symbol: e.target.value })}
                      placeholder="Symbol (BTC)"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={holding.name}
                      onChange={(e) => updateHolding(index, { name: e.target.value })}
                      placeholder="Name (Bitcoin)"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={holding.amount}
                      onChange={(e) => updateHolding(index, { amount: parseFloat(e.target.value) || 0 })}
                      placeholder="Amount"
                      step="0.00000001"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHolding(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  
  function renderInvestmentAccountFields() {
    const data = assetData as InvestmentAccountData
    
    const addHolding = () => {
      setAssetData({
        ...data,
        holdings: [...(data.holdings || []), {
          name: '',
          quantity: 0,
          assetClass: 'stock'
        }]
      })
    }
    
    const updateHolding = (index: number, updates: Partial<InvestmentHolding>) => {
      const holdings = [...(data.holdings || [])]
      holdings[index] = { ...holdings[index], ...updates }
      setAssetData({ ...data, holdings })
    }
    
    const removeHolding = (index: number) => {
      setAssetData({
        ...data,
        holdings: (data.holdings || []).filter((_, i) => i !== index)
      })
    }
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider
            </label>
            <input
              type="text"
              value={data.provider}
              onChange={(e) => setAssetData({ ...data, provider: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Vanguard, Fidelity, Charles Schwab"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              value={data.accountType}
              onChange={(e) => setAssetData({ ...data, accountType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="brokerage">Brokerage</option>
              <option value="retirement">Retirement (401k/IRA)</option>
              <option value="savings">Savings</option>
              <option value="crypto">Crypto</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number
          </label>
          <input
            type="text"
            value={data.accountNumber}
            onChange={(e) => {
              setAssetData({ ...data, accountNumber: e.target.value })
              setAccountNumber(e.target.value) // Also update main account number
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Holdings */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Holdings (Optional)
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addHolding}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Holding
            </Button>
          </div>
          
          {data.holdings && data.holdings.length > 0 && (
            <div className="space-y-2">
              {data.holdings.map((holding, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={holding.symbol || ''}
                      onChange={(e) => updateHolding(index, { symbol: e.target.value })}
                      placeholder="Symbol"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={holding.name}
                      onChange={(e) => updateHolding(index, { name: e.target.value })}
                      placeholder="Name"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={holding.assetClass}
                      onChange={(e) => updateHolding(index, { assetClass: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="stock">Stock</option>
                      <option value="bond">Bond</option>
                      <option value="etf">ETF</option>
                      <option value="mutual_fund">Mutual Fund</option>
                      <option value="crypto">Crypto</option>
                      <option value="commodity">Commodity</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHolding(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  
  function renderSubscriptionServiceFields() {
    const data = assetData as SubscriptionServiceData
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name
            </label>
            <input
              type="text"
              value={data.serviceName}
              onChange={(e) => setAssetData({ ...data, serviceName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Netflix, Spotify, Adobe Creative Cloud"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan
            </label>
            <input
              type="text"
              value={data.plan}
              onChange={(e) => setAssetData({ ...data, plan: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Premium, Pro, Business"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Cycle
            </label>
            <select
              value={data.billingCycle}
              onChange={(e) => setAssetData({ ...data, billingCycle: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={data.startDate}
              onChange={(e) => setAssetData({ ...data, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Features
          </label>
          <textarea
            value={data.features?.join('\n') || ''}
            onChange={(e) => setAssetData({ ...data, features: e.target.value.split('\n').filter(f => f.trim()) })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="List features (one per line)"
          />
        </div>
      </div>
    )
  }
  
  function renderSocialMediaFields() {
    const data = assetData as SocialMediaData
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <input
              type="text"
              value={data.platform}
              onChange={(e) => setAssetData({ ...data, platform: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Twitter, LinkedIn, Instagram"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={data.username}
              onChange={(e) => {
                setAssetData({ ...data, username: e.target.value })
                setUsername(e.target.value) // Also update main username
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="@username"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profile URL
          </label>
          <input
            type="url"
            value={data.profileUrl || ''}
            onChange={(e) => setAssetData({ ...data, profileUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.verifiedAccount || false}
              onChange={(e) => setAssetData({ ...data, verifiedAccount: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Verified Account</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.businessAccount || false}
              onChange={(e) => setAssetData({ ...data, businessAccount: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Business Account</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.monetizationEnabled || false}
              onChange={(e) => setAssetData({ ...data, monetizationEnabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Monetization Enabled</span>
          </label>
        </div>
      </div>
    )
  }
  
  function renderCloudStorageFields() {
    const data = assetData as CloudStorageData
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provider
          </label>
          <input
            type="text"
            value={data.provider}
            onChange={(e) => setAssetData({ ...data, provider: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Google Drive, Dropbox, iCloud"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Storage Used (GB)
            </label>
            <input
              type="number"
              value={data.storageUsed / (1024 * 1024 * 1024)}
              onChange={(e) => setAssetData({ ...data, storageUsed: (parseFloat(e.target.value) || 0) * 1024 * 1024 * 1024 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Storage Limit (GB)
            </label>
            <input
              type="number"
              value={data.storageLimit / (1024 * 1024 * 1024)}
              onChange={(e) => setAssetData({ ...data, storageLimit: (parseFloat(e.target.value) || 0) * 1024 * 1024 * 1024 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.1"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.encryptionEnabled || false}
              onChange={(e) => setAssetData({ ...data, encryptionEnabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Encryption Enabled</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={data.backupEnabled || false}
              onChange={(e) => setAssetData({ ...data, backupEnabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Automatic Backup</span>
          </label>
        </div>
      </div>
    )
  }
  
  function renderDigitalCollectibleFields() {
    const data = assetData as DigitalCollectibleData
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <input
              type="text"
              value={data.platform}
              onChange={(e) => setAssetData({ ...data, platform: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., OpenSea, Rarible, NBA Top Shot"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection Name
            </label>
            <input
              type="text"
              value={data.collectionName || ''}
              onChange={(e) => setAssetData({ ...data, collectionName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., CryptoPunks, Bored Ape Yacht Club"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token ID
            </label>
            <input
              type="text"
              value={data.tokenId || ''}
              onChange={(e) => setAssetData({ ...data, tokenId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#1234"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Blockchain
            </label>
            <input
              type="text"
              value={data.blockchain || ''}
              onChange={(e) => setAssetData({ ...data, blockchain: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Ethereum, Polygon, Solana"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contract Address
          </label>
          <input
            type="text"
            value={data.contractAddress || ''}
            onChange={(e) => setAssetData({ ...data, contractAddress: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="0x..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rarity
          </label>
          <input
            type="text"
            value={data.rarity || ''}
            onChange={(e) => setAssetData({ ...data, rarity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Common, Rare, Legendary"
          />
        </div>
      </div>
    )
  }
  
  function renderSoftwareLicenseFields() {
    const data = assetData as SoftwareLicenseData
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Software Name
            </label>
            <input
              type="text"
              value={data.software}
              onChange={(e) => setAssetData({ ...data, software: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Microsoft Office, Adobe Photoshop"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version
            </label>
            <input
              type="text"
              value={data.version || ''}
              onChange={(e) => setAssetData({ ...data, version: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 2021, CC 2023"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Type
            </label>
            <select
              value={data.licenseType}
              onChange={(e) => setAssetData({ ...data, licenseType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="perpetual">Perpetual</option>
              <option value="subscription">Subscription</option>
              <option value="trial">Trial</option>
              <option value="open_source">Open Source</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Seats
            </label>
            <input
              type="number"
              value={data.seats || ''}
              onChange={(e) => setAssetData({ ...data, seats: parseInt(e.target.value) || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            License Key
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={data.licenseKey || ''}
              onChange={(e) => setAssetData({ ...data, licenseKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="XXXX-XXXX-XXXX-XXXX"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  function renderAPIKeyFields() {
    const data = assetData as APIKeyData
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Name
          </label>
          <input
            type="text"
            value={data.service}
            onChange={(e) => setAssetData({ ...data, service: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., OpenAI, Google Maps, Stripe"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Name
            </label>
            <input
              type="text"
              value={data.keyName || ''}
              onChange={(e) => setAssetData({ ...data, keyName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Production API Key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Environment
            </label>
            <select
              value={data.environment || 'production'}
              onChange={(e) => setAssetData({ ...data, environment: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={data.keyValue || ''}
              onChange={(e) => setAssetData({ ...data, keyValue: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="sk-..."
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Permissions
          </label>
          <textarea
            value={data.permissions?.join('\n') || ''}
            onChange={(e) => setAssetData({ ...data, permissions: e.target.value.split('\n').filter(p => p.trim()) })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="List permissions (one per line)"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rate Limit
          </label>
          <input
            type="text"
            value={data.rateLimit || ''}
            onChange={(e) => setAssetData({ ...data, rateLimit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 1000 requests/hour"
          />
        </div>
      </div>
    )
  }
  
  function renderServerFields() {
    const data = assetData as ServerData
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider
            </label>
            <input
              type="text"
              value={data.provider}
              onChange={(e) => setAssetData({ ...data, provider: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., AWS, DigitalOcean, Linode"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server Name
            </label>
            <input
              type="text"
              value={data.serverName}
              onChange={(e) => setAssetData({ ...data, serverName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., production-web-01"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IP Address
            </label>
            <input
              type="text"
              value={data.ipAddress || ''}
              onChange={(e) => setAssetData({ ...data, ipAddress: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="192.168.1.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={data.location || ''}
              onChange={(e) => setAssetData({ ...data, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., US-East-1, Europe-West-2"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operating System
            </label>
            <input
              type="text"
              value={data.operatingSystem || ''}
              onChange={(e) => setAssetData({ ...data, operatingSystem: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Ubuntu 22.04, Windows Server 2022"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purpose
            </label>
            <input
              type="text"
              value={data.purpose || ''}
              onChange={(e) => setAssetData({ ...data, purpose: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Web Server, Database, CI/CD"
            />
          </div>
        </div>
        
        {/* Server Specifications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specifications
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={data.specifications?.cpu || ''}
              onChange={(e) => setAssetData({ ...data, specifications: { ...data.specifications, cpu: e.target.value } })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="CPU: 4 vCPUs"
            />
            <input
              type="text"
              value={data.specifications?.ram || ''}
              onChange={(e) => setAssetData({ ...data, specifications: { ...data.specifications, ram: e.target.value } })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="RAM: 16GB"
            />
            <input
              type="text"
              value={data.specifications?.storage || ''}
              onChange={(e) => setAssetData({ ...data, specifications: { ...data.specifications, storage: e.target.value } })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Storage: 500GB SSD"
            />
            <input
              type="text"
              value={data.specifications?.bandwidth || ''}
              onChange={(e) => setAssetData({ ...data, specifications: { ...data.specifications, bandwidth: e.target.value } })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bandwidth: 5TB/month"
            />
          </div>
        </div>
      </div>
    )
  }
  
  function renderDatabaseFields() {
    const data = assetData as DatabaseData
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider
            </label>
            <input
              type="text"
              value={data.provider}
              onChange={(e) => setAssetData({ ...data, provider: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., AWS RDS, MongoDB Atlas, Supabase"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Database Type
            </label>
            <input
              type="text"
              value={data.databaseType}
              onChange={(e) => setAssetData({ ...data, databaseType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., PostgreSQL, MySQL, MongoDB"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Database Name
          </label>
          <input
            type="text"
            value={data.databaseName}
            onChange={(e) => setAssetData({ ...data, databaseName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., production_db"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Host
            </label>
            <input
              type="text"
              value={data.host || ''}
              onChange={(e) => setAssetData({ ...data, host: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="db.example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port
            </label>
            <input
              type="number"
              value={data.port || ''}
              onChange={(e) => setAssetData({ ...data, port: parseInt(e.target.value) || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="5432"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Database Size
            </label>
            <input
              type="text"
              value={data.size || ''}
              onChange={(e) => setAssetData({ ...data, size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 250GB"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Backup Schedule
            </label>
            <input
              type="text"
              value={data.backupSchedule || ''}
              onChange={(e) => setAssetData({ ...data, backupSchedule: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Daily at 2 AM"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Credentials
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={data.credentials?.username || ''}
              onChange={(e) => setAssetData({ ...data, credentials: { ...data.credentials, username: e.target.value } })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Username"
            />
            <input
              type="text"
              value={data.credentials?.passwordHint || ''}
              onChange={(e) => setAssetData({ ...data, credentials: { ...data.credentials, passwordHint: e.target.value } })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password hint"
            />
          </div>
        </div>
      </div>
    )
  }
  
  function renderEmailAccountFields() {
    const data = assetData as EmailAccountData
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={data.emailAddress}
              onChange={(e) => {
                setAssetData({ ...data, emailAddress: e.target.value })
                setEmail(e.target.value) // Also update main email
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider
            </label>
            <input
              type="text"
              value={data.provider}
              onChange={(e) => setAssetData({ ...data, provider: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Gmail, Outlook, ProtonMail"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Type
          </label>
          <select
            value={data.accountType}
            onChange={(e) => setAssetData({ ...data, accountType: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="alias">Alias</option>
            <option value="forward">Forward Only</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Aliases
          </label>
          <textarea
            value={data.aliases?.join('\n') || ''}
            onChange={(e) => setAssetData({ ...data, aliases: e.target.value.split('\n').filter(a => a.trim()) })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="List aliases (one per line)"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Forwarding Addresses
          </label>
          <textarea
            value={data.forwardingAddresses?.join('\n') || ''}
            onChange={(e) => setAssetData({ ...data, forwardingAddresses: e.target.value.split('\n').filter(a => a.trim()) })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="List forwarding addresses (one per line)"
          />
        </div>
      </div>
    )
  }
  
  function renderGenericFields() {
    const data = assetData as GenericAssetData
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asset Type
          </label>
          <input
            type="text"
            value={data.assetType || ''}
            onChange={(e) => setAssetData({ ...data, assetType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the type of asset"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Details
          </label>
          <textarea
            value={JSON.stringify(data.details || {}, null, 2)}
            onChange={(e) => {
              try {
                const details = JSON.parse(e.target.value)
                setAssetData({ ...data, details })
              } catch {
                // Invalid JSON, ignore
              }
            }}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder='{\n  "key": "value"\n}'
          />
        </div>
      </div>
    )
  }
}