'use client'

import { useState, useCallback } from 'react'
import { 
  X, 
  Edit, 
  Trash2, 
  Copy, 
  ExternalLink,
  Shield,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  Star,
  StarOff,
  Key,
  Globe,
  Server,
  Database,
  Mail,
  CreditCard,
  Cloud,
  Package,
  Users,
  Code,
  HardDrive,
  CheckCircle,
  XCircle,
  Info,
  Eye,
  EyeOff,
  Link as LinkIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DigitalAsset, 
  DigitalAssetInventory,
  DigitalAssetType,
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

interface DigitalAssetDetailViewProps {
  asset: DigitalAsset
  inventory: DigitalAssetInventory
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  formatCurrency: (amount: number, currency: string) => string
}

export default function DigitalAssetDetailView({ 
  asset, 
  inventory,
  onClose, 
  onEdit, 
  onDelete,
  formatCurrency
}: DigitalAssetDetailViewProps) {
  const [showSensitive, setShowSensitive] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
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
  
  // Get importance color
  const getImportanceColor = useCallback((importance: string) => {
    switch (importance) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }, [])
  
  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])
  
  // Format date
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }, [])
  
  // Calculate days until expiry
  const daysUntilExpiry = useCallback((expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }, [])
  
  const TypeIcon = getTypeIcon(asset.type)
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <TypeIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{asset.name}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-500">
                  {asset.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-500 capitalize">{asset.category}</span>
                <span className="text-gray-400">•</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(asset.importance)}`}>
                  {asset.importance}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-6">
            {/* Status and Alerts */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                {asset.isFavorite && (
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <Star className="h-5 w-5 fill-current" />
                    <span className="text-sm font-medium">Favorite</span>
                  </div>
                )}
                {asset.isActive ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-gray-400">
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Inactive</span>
                  </div>
                )}
                {asset.twoFactorEnabled && (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Shield className="h-5 w-5" />
                    <span className="text-sm font-medium">2FA Enabled</span>
                  </div>
                )}
              </div>
              
              {/* Expiry Warning */}
              {asset.expiryDate && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                  daysUntilExpiry(asset.expiryDate) <= 30 
                    ? 'bg-red-50 text-red-700' 
                    : 'bg-yellow-50 text-yellow-700'
                }`}>
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Expires in {daysUntilExpiry(asset.expiryDate)} days
                  </span>
                </div>
              )}
            </div>
            
            {/* Description */}
            {asset.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600">{asset.description}</p>
              </div>
            )}
            
            {/* Tags */}
            {asset.tags && asset.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Type-Specific Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Asset Details</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {renderTypeSpecificDetails()}
              </div>
            </div>
            
            {/* Access Information */}
            {(asset.accessUrl || asset.username || asset.email || asset.accountNumber || asset.customerId) && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Access Information</h3>
                <div className="space-y-2">
                  {asset.accessUrl && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-500">URL</span>
                        <p className="font-medium">{asset.accessUrl}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(asset.accessUrl!, 'url')}
                        >
                          {copiedField === 'url' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <a
                          href={asset.accessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {asset.username && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-500">Username</span>
                        <p className="font-medium">{asset.username}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(asset.username!, 'username')}
                      >
                        {copiedField === 'username' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {asset.email && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-500">Email</span>
                        <p className="font-medium">{asset.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(asset.email!, 'email')}
                      >
                        {copiedField === 'email' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {asset.accountNumber && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-500">Account Number</span>
                        <p className="font-medium font-mono">
                          {showSensitive ? asset.accountNumber : '••••••' + asset.accountNumber.slice(-4)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSensitive(!showSensitive)}
                        >
                          {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(asset.accountNumber!, 'account')}
                        >
                          {copiedField === 'account' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {asset.customerId && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm text-gray-500">Customer ID</span>
                        <p className="font-medium">{asset.customerId}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(asset.customerId!, 'customer')}
                      >
                        {copiedField === 'customer' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Financial Information */}
            {(asset.value || asset.costs) && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Financial Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {asset.value && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">Asset Value</p>
                          <p className="text-2xl font-bold text-green-800">
                            {formatCurrency(asset.value.amount, asset.value.currency)}
                          </p>
                          {asset.value.isEstimate && (
                            <p className="text-xs text-green-600 mt-1">Estimated value</p>
                          )}
                        </div>
                        <DollarSign className="h-8 w-8 text-green-300" />
                      </div>
                    </div>
                  )}
                  
                  {asset.costs && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-yellow-600 font-medium">
                            {asset.costs.type === 'recurring' ? 'Recurring Cost' : 
                             asset.costs.type === 'one_time' ? 'One-Time Cost' : 'Usage-Based Cost'}
                          </p>
                          <p className="text-2xl font-bold text-yellow-800">
                            {formatCurrency(asset.costs.amount, asset.costs.currency)}
                            {asset.costs.frequency && (
                              <span className="text-sm font-normal">/{asset.costs.frequency}</span>
                            )}
                          </p>
                          {asset.costs.nextBillingDate && (
                            <p className="text-xs text-yellow-600 mt-1">
                              Next billing: {formatDate(asset.costs.nextBillingDate)}
                            </p>
                          )}
                        </div>
                        <Clock className="h-8 w-8 text-yellow-300" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Lifecycle Information */}
            {(asset.expiryDate || asset.renewalDate || asset.autoRenew) && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Lifecycle Management</h3>
                <div className="space-y-2">
                  {asset.expiryDate && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Expiry Date</p>
                          <p className="font-medium">{formatDate(asset.expiryDate)}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        daysUntilExpiry(asset.expiryDate) <= 30 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {daysUntilExpiry(asset.expiryDate)} days
                      </span>
                    </div>
                  )}
                  
                  {asset.renewalDate && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Renewal Date</p>
                        <p className="font-medium">{formatDate(asset.renewalDate)}</p>
                      </div>
                    </div>
                  )}
                  
                  {asset.autoRenew !== undefined && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      {asset.autoRenew ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Auto-Renewal</p>
                        <p className="font-medium">{asset.autoRenew ? 'Enabled' : 'Disabled'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Security Information */}
            {(asset.twoFactorEnabled || asset.recoveryMethods?.length || asset.securityNotes) && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Security</h3>
                <div className="space-y-2">
                  {asset.twoFactorEnabled && (
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <Shield className="h-5 w-5 text-green-600" />
                      <p className="text-sm font-medium text-green-800">
                        Two-factor authentication is enabled
                      </p>
                    </div>
                  )}
                  
                  {asset.recoveryMethods && asset.recoveryMethods.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Recovery Methods</p>
                      <div className="space-y-1">
                        {asset.recoveryMethods.map((method, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 capitalize">
                              {method.type.replace('_', ' ')}
                            </span>
                            {method.value && (
                              <span className="text-gray-800 font-medium">
                                {method.type === 'email' || method.type === 'phone' 
                                  ? (showSensitive ? method.value : '••••' + method.value.slice(-4))
                                  : method.value
                                }
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {asset.securityNotes && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-800 mb-1">Security Notes</p>
                          <p className="text-sm text-yellow-700">{asset.securityNotes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Related Assets */}
            {asset.relatedAssets && asset.relatedAssets.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Related Assets</h3>
                <div className="space-y-2">
                  {asset.relatedAssets.map(relatedId => {
                    const relatedAsset = inventory.assets.find(a => a.id === relatedId)
                    if (!relatedAsset) return null
                    const RelatedIcon = getTypeIcon(relatedAsset.type)
                    
                    return (
                      <div key={relatedId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <RelatedIcon className="h-5 w-5 text-gray-500" />
                        <div className="flex-1">
                          <p className="font-medium">{relatedAsset.name}</p>
                          <p className="text-sm text-gray-500">
                            {relatedAsset.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </p>
                        </div>
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Notes */}
            {asset.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{asset.notes}</p>
                </div>
              </div>
            )}
            
            {/* Custom Fields */}
            {asset.customFields && asset.customFields.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Fields</h3>
                <div className="space-y-2">
                  {asset.customFields.map(field => (
                    <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <span className="text-sm text-gray-500">{field.label}</span>
                        <p className="font-medium">
                          {field.isSecret && !showSensitive 
                            ? '••••••••' 
                            : field.value
                          }
                        </p>
                      </div>
                      {field.isSecret && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSensitive(!showSensitive)}
                        >
                          {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(field.value, field.id)}
                      >
                        {copiedField === field.id ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Metadata */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <p>Created: {formatDate(asset.createdAt)}</p>
                </div>
                <div>
                  <p>Updated: {formatDate(asset.updatedAt)}</p>
                </div>
                {asset.lastVerified && (
                  <div>
                    <p>Last Verified: {formatDate(asset.lastVerified)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  
  // Render type-specific details based on asset type
  function renderTypeSpecificDetails() {
    switch (asset.type) {
      case 'online_account':
        return renderOnlineAccountDetails()
      case 'domain_name':
        return renderDomainNameDetails()
      case 'cryptocurrency':
        return renderCryptocurrencyDetails()
      case 'investment_account':
        return renderInvestmentAccountDetails()
      case 'subscription_service':
        return renderSubscriptionServiceDetails()
      case 'social_media':
        return renderSocialMediaDetails()
      case 'cloud_storage':
        return renderCloudStorageDetails()
      case 'digital_collectible':
        return renderDigitalCollectibleDetails()
      case 'software_license':
        return renderSoftwareLicenseDetails()
      case 'api_key':
        return renderAPIKeyDetails()
      case 'server':
        return renderServerDetails()
      case 'database':
        return renderDatabaseDetails()
      case 'email_account':
        return renderEmailAccountDetails()
      default:
        return renderGenericDetails()
    }
  }
  
  function renderOnlineAccountDetails() {
    const data = asset.assetData as OnlineAccountData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Service</span>
          <span className="font-medium">{data.serviceName}</span>
        </div>
        {data.accountType && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Account Type</span>
            <span className="font-medium">{data.accountType}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Status</span>
          <span className={`font-medium capitalize ${
            data.accountStatus === 'active' ? 'text-green-600' :
            data.accountStatus === 'suspended' ? 'text-yellow-600' :
            data.accountStatus === 'closed' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {data.accountStatus}
          </span>
        </div>
        {data.registrationDate && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Registration Date</span>
            <span className="font-medium">{formatDate(data.registrationDate)}</span>
          </div>
        )}
      </div>
    )
  }
  
  function renderDomainNameDetails() {
    const data = asset.assetData as DomainNameData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Domain</span>
          <span className="font-medium font-mono">{data.domainName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Registrar</span>
          <span className="font-medium">{data.registrar}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Registered</span>
          <span className="font-medium">{formatDate(data.registrationDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Expires</span>
          <span className="font-medium">{formatDate(data.expiryDate)}</span>
        </div>
        {data.dnsProvider && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">DNS Provider</span>
            <span className="font-medium">{data.dnsProvider}</span>
          </div>
        )}
        <div className="flex items-center space-x-4 pt-2">
          {data.autoRenew && (
            <span className="flex items-center text-sm text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              Auto-renew
            </span>
          )}
          {data.privacyProtection && (
            <span className="flex items-center text-sm text-blue-600">
              <Shield className="h-4 w-4 mr-1" />
              Privacy protection
            </span>
          )}
          {data.transferLock && (
            <span className="flex items-center text-sm text-orange-600">
              <Key className="h-4 w-4 mr-1" />
              Transfer lock
            </span>
          )}
        </div>
      </div>
    )
  }
  
  function renderCryptocurrencyDetails() {
    const data = asset.assetData as CryptocurrencyData
    return (
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Platform</span>
          <span className="font-medium">{data.platform}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Wallet Type</span>
          <span className="font-medium capitalize">{data.walletType.replace('_', ' ')}</span>
        </div>
        {data.walletAddress && (
          <div>
            <span className="text-sm text-gray-500">Wallet Address</span>
            <p className="font-medium font-mono text-xs mt-1 break-all">
              {showSensitive ? data.walletAddress : data.walletAddress.slice(0, 10) + '...' + data.walletAddress.slice(-8)}
            </p>
          </div>
        )}
        {data.hardwareDevice && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Hardware Device</span>
            <span className="font-medium">{data.hardwareDevice}</span>
          </div>
        )}
        {data.holdings && data.holdings.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Holdings</p>
            <div className="space-y-1">
              {data.holdings.map((holding, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{holding.name} ({holding.symbol})</span>
                  <span className="font-medium">{holding.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  function renderInvestmentAccountDetails() {
    const data = asset.assetData as InvestmentAccountData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Provider</span>
          <span className="font-medium">{data.provider}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Account Type</span>
          <span className="font-medium capitalize">{data.accountType.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Account Number</span>
          <span className="font-medium font-mono">
            {showSensitive ? data.accountNumber : '••••' + data.accountNumber.slice(-4)}
          </span>
        </div>
        {data.performanceYTD !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">YTD Performance</span>
            <span className={`font-medium ${data.performanceYTD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.performanceYTD >= 0 ? '+' : ''}{data.performanceYTD}%
            </span>
          </div>
        )}
        {data.managementFee !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Management Fee</span>
            <span className="font-medium">{data.managementFee}%</span>
          </div>
        )}
      </div>
    )
  }
  
  function renderSubscriptionServiceDetails() {
    const data = asset.assetData as SubscriptionServiceData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Service</span>
          <span className="font-medium">{data.serviceName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Plan</span>
          <span className="font-medium">{data.plan}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Billing Cycle</span>
          <span className="font-medium capitalize">{data.billingCycle}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Start Date</span>
          <span className="font-medium">{formatDate(data.startDate)}</span>
        </div>
        {data.features && data.features.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Features</p>
            <ul className="text-sm space-y-0.5">
              {data.features.map((feature, index) => (
                <li key={index} className="text-gray-700">• {feature}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }
  
  function renderSocialMediaDetails() {
    const data = asset.assetData as SocialMediaData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Platform</span>
          <span className="font-medium">{data.platform}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Username</span>
          <span className="font-medium">{data.username}</span>
        </div>
        {data.profileUrl && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Profile URL</span>
            <a
              href={data.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
        {(data.followers !== undefined || data.following !== undefined) && (
          <div className="flex space-x-4 pt-2">
            {data.followers !== undefined && (
              <div>
                <p className="text-2xl font-bold">{data.followers.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Followers</p>
              </div>
            )}
            {data.following !== undefined && (
              <div>
                <p className="text-2xl font-bold">{data.following.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Following</p>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center space-x-4 pt-2">
          {data.verifiedAccount && (
            <span className="flex items-center text-sm text-blue-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              Verified
            </span>
          )}
          {data.businessAccount && (
            <span className="flex items-center text-sm text-purple-600">
              <Users className="h-4 w-4 mr-1" />
              Business
            </span>
          )}
          {data.monetizationEnabled && (
            <span className="flex items-center text-sm text-green-600">
              <DollarSign className="h-4 w-4 mr-1" />
              Monetized
            </span>
          )}
        </div>
      </div>
    )
  }
  
  function renderCloudStorageDetails() {
    const data = asset.assetData as CloudStorageData
    const usagePercent = (data.storageUsed / data.storageLimit) * 100
    
    return (
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Provider</span>
          <span className="font-medium">{data.provider}</span>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-500">Storage Usage</span>
            <span className="text-sm font-medium">
              {(data.storageUsed / (1024 * 1024 * 1024)).toFixed(1)} GB / {(data.storageLimit / (1024 * 1024 * 1024)).toFixed(0)} GB
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                usagePercent > 90 ? 'bg-red-600' :
                usagePercent > 75 ? 'bg-yellow-600' :
                'bg-green-600'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
        {data.fileCount !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">File Count</span>
            <span className="font-medium">{data.fileCount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex items-center space-x-4 pt-2">
          {data.encryptionEnabled && (
            <span className="flex items-center text-sm text-green-600">
              <Shield className="h-4 w-4 mr-1" />
              Encrypted
            </span>
          )}
          {data.backupEnabled && (
            <span className="flex items-center text-sm text-blue-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              Auto-backup
            </span>
          )}
        </div>
      </div>
    )
  }
  
  function renderDigitalCollectibleDetails() {
    const data = asset.assetData as DigitalCollectibleData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Platform</span>
          <span className="font-medium">{data.platform}</span>
        </div>
        {data.collectionName && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Collection</span>
            <span className="font-medium">{data.collectionName}</span>
          </div>
        )}
        {data.tokenId && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Token ID</span>
            <span className="font-medium">#{data.tokenId}</span>
          </div>
        )}
        {data.blockchain && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Blockchain</span>
            <span className="font-medium">{data.blockchain}</span>
          </div>
        )}
        {data.rarity && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Rarity</span>
            <span className="font-medium capitalize">{data.rarity}</span>
          </div>
        )}
        {data.contractAddress && (
          <div>
            <span className="text-sm text-gray-500">Contract Address</span>
            <p className="font-medium font-mono text-xs mt-1">
              {showSensitive ? data.contractAddress : data.contractAddress.slice(0, 10) + '...' + data.contractAddress.slice(-8)}
            </p>
          </div>
        )}
      </div>
    )
  }
  
  function renderSoftwareLicenseDetails() {
    const data = asset.assetData as SoftwareLicenseData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Software</span>
          <span className="font-medium">{data.software}</span>
        </div>
        {data.version && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Version</span>
            <span className="font-medium">{data.version}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">License Type</span>
          <span className="font-medium capitalize">{data.licenseType.replace('_', ' ')}</span>
        </div>
        {data.licenseKey && (
          <div>
            <span className="text-sm text-gray-500">License Key</span>
            <p className="font-medium font-mono text-sm mt-1">
              {showSensitive ? data.licenseKey : '••••-••••-••••-••••'}
            </p>
          </div>
        )}
        {data.seats !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Seats</span>
            <span className="font-medium">
              {data.activations !== undefined ? `${data.activations}/${data.seats}` : data.seats}
            </span>
          </div>
        )}
        {data.supportExpiry && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Support Expires</span>
            <span className="font-medium">{formatDate(data.supportExpiry)}</span>
          </div>
        )}
      </div>
    )
  }
  
  function renderAPIKeyDetails() {
    const data = asset.assetData as APIKeyData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Service</span>
          <span className="font-medium">{data.service}</span>
        </div>
        {data.keyName && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Key Name</span>
            <span className="font-medium">{data.keyName}</span>
          </div>
        )}
        {data.environment && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Environment</span>
            <span className="font-medium capitalize">{data.environment}</span>
          </div>
        )}
        {data.keyValue && (
          <div>
            <span className="text-sm text-gray-500">API Key</span>
            <p className="font-medium font-mono text-sm mt-1">
              {showSensitive ? data.keyValue : data.keyValue.slice(0, 8) + '...' + data.keyValue.slice(-4)}
            </p>
          </div>
        )}
        {data.rateLimit && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Rate Limit</span>
            <span className="font-medium">{data.rateLimit}</span>
          </div>
        )}
        {data.usage && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-500">Usage</span>
              <span className="text-sm font-medium">
                {data.usage.current.toLocaleString()} / {data.usage.limit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  (data.usage.current / data.usage.limit) > 0.9 ? 'bg-red-600' :
                  (data.usage.current / data.usage.limit) > 0.75 ? 'bg-yellow-600' :
                  'bg-green-600'
                }`}
                style={{ width: `${Math.min((data.usage.current / data.usage.limit) * 100, 100)}%` }}
              />
            </div>
            {data.usage.resetDate && (
              <p className="text-xs text-gray-500 mt-1">
                Resets: {formatDate(data.usage.resetDate)}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
  
  function renderServerDetails() {
    const data = asset.assetData as ServerData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Provider</span>
          <span className="font-medium">{data.provider}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Server Name</span>
          <span className="font-medium">{data.serverName}</span>
        </div>
        {data.ipAddress && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">IP Address</span>
            <span className="font-medium font-mono">{data.ipAddress}</span>
          </div>
        )}
        {data.location && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Location</span>
            <span className="font-medium">{data.location}</span>
          </div>
        )}
        {data.operatingSystem && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">OS</span>
            <span className="font-medium">{data.operatingSystem}</span>
          </div>
        )}
        {data.specifications && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Specifications</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {data.specifications.cpu && (
                <div className="bg-gray-100 p-2 rounded">
                  <p className="text-xs text-gray-500">CPU</p>
                  <p className="font-medium">{data.specifications.cpu}</p>
                </div>
              )}
              {data.specifications.ram && (
                <div className="bg-gray-100 p-2 rounded">
                  <p className="text-xs text-gray-500">RAM</p>
                  <p className="font-medium">{data.specifications.ram}</p>
                </div>
              )}
              {data.specifications.storage && (
                <div className="bg-gray-100 p-2 rounded">
                  <p className="text-xs text-gray-500">Storage</p>
                  <p className="font-medium">{data.specifications.storage}</p>
                </div>
              )}
              {data.specifications.bandwidth && (
                <div className="bg-gray-100 p-2 rounded">
                  <p className="text-xs text-gray-500">Bandwidth</p>
                  <p className="font-medium">{data.specifications.bandwidth}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  function renderDatabaseDetails() {
    const data = asset.assetData as DatabaseData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Provider</span>
          <span className="font-medium">{data.provider}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Database Type</span>
          <span className="font-medium">{data.databaseType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Database Name</span>
          <span className="font-medium font-mono">{data.databaseName}</span>
        </div>
        {data.host && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Host</span>
            <span className="font-medium">{data.host}{data.port ? `:${data.port}` : ''}</span>
          </div>
        )}
        {data.size && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Size</span>
            <span className="font-medium">{data.size}</span>
          </div>
        )}
        {data.backupSchedule && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Backup Schedule</span>
            <span className="font-medium">{data.backupSchedule}</span>
          </div>
        )}
      </div>
    )
  }
  
  function renderEmailAccountDetails() {
    const data = asset.assetData as EmailAccountData
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Email Address</span>
          <span className="font-medium">{data.emailAddress}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Provider</span>
          <span className="font-medium">{data.provider}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Account Type</span>
          <span className="font-medium capitalize">{data.accountType}</span>
        </div>
        {data.storageUsed !== undefined && data.storageLimit !== undefined && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-500">Storage</span>
              <span className="text-sm font-medium">
                {(data.storageUsed / (1024 * 1024 * 1024)).toFixed(1)} GB / {(data.storageLimit / (1024 * 1024 * 1024)).toFixed(0)} GB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  (data.storageUsed / data.storageLimit) > 0.9 ? 'bg-red-600' :
                  (data.storageUsed / data.storageLimit) > 0.75 ? 'bg-yellow-600' :
                  'bg-green-600'
                }`}
                style={{ width: `${Math.min((data.storageUsed / data.storageLimit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
        {data.aliases && data.aliases.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Aliases</p>
            <div className="space-y-1">
              {data.aliases.map((alias, index) => (
                <p key={index} className="text-sm">{alias}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  function renderGenericDetails() {
    const data = asset.assetData as GenericAssetData
    return (
      <div className="space-y-2">
        {data.assetType && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Type</span>
            <span className="font-medium">{data.assetType}</span>
          </div>
        )}
        {data.details && Object.keys(data.details).map(key => (
          <div key={key} className="flex justify-between">
            <span className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
            <span className="font-medium">{String(data.details![key])}</span>
          </div>
        ))}
      </div>
    )
  }
}