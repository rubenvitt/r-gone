'use client'

import { useState, useCallback, useMemo } from 'react'
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  Star, 
  StarOff,
  DollarSign,
  AlertTriangle,
  Calendar,
  Edit,
  Trash2,
  MoreVertical,
  Filter,
  Download,
  Upload,
  Shield,
  Clock,
  TrendingUp,
  TrendingDown,
  Globe,
  Server,
  Key,
  Mail,
  Smartphone,
  CreditCard,
  Cloud,
  Database,
  Code,
  Package,
  Users,
  Link
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DigitalAsset, 
  DigitalAssetInventory as DigitalAssetInventoryType, 
  DigitalAssetType,
  DigitalAssetCategory,
  AssetFilter,
  ImportanceLevel,
  AssetAlert
} from '@/types/data'
import { digitalAssetInventoryService } from '@/services/digital-asset-inventory-service'
import DigitalAssetForm from './DigitalAssetForm'
import DigitalAssetDetailView from './DigitalAssetDetailView'
import DigitalAssetImportModal from './DigitalAssetImportModal'

interface DigitalAssetInventoryProps {
  inventory: DigitalAssetInventoryType
  onInventoryChange: (inventory: DigitalAssetInventoryType) => void
  className?: string
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'type' | 'category' | 'value' | 'expiry' | 'created'

export default function DigitalAssetInventory({ 
  inventory, 
  onInventoryChange, 
  className = '' 
}: DigitalAssetInventoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<AssetFilter>({})
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [viewingAsset, setViewingAsset] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Get active alerts
  const activeAlerts = useMemo(() => 
    digitalAssetInventoryService.getActiveAlerts(inventory),
    [inventory]
  )

  // Calculate totals
  const totalValue = useMemo(() => 
    digitalAssetInventoryService.calculateTotalValue(inventory, inventory.settings.currencyPreference),
    [inventory]
  )

  const recurringCosts = useMemo(() => 
    digitalAssetInventoryService.calculateRecurringCosts(inventory, inventory.settings.currencyPreference),
    [inventory]
  )

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    let assets = inventory.assets

    // Apply search
    if (searchTerm) {
      const searchResults = digitalAssetInventoryService.searchAssets(inventory, searchTerm)
      assets = searchResults.map(result => result.asset)
    } else {
      // Apply filters
      assets = digitalAssetInventoryService.filterAssets(inventory, filter)
    }

    // Sort assets
    assets.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'type':
          return a.type.localeCompare(b.type)
        case 'category':
          return a.category.localeCompare(b.category)
        case 'value':
          const aValue = a.value?.amount || 0
          const bValue = b.value?.amount || 0
          return bValue - aValue
        case 'expiry':
          const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
          const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
          return aExpiry - bExpiry
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

    return assets
  }, [inventory, searchTerm, filter, sortBy])

  // Toggle favorite
  const toggleFavorite = useCallback((assetId: string) => {
    const asset = inventory.assets.find(a => a.id === assetId)
    if (asset) {
      const updatedInventory = digitalAssetInventoryService.updateAsset(inventory, assetId, {
        isFavorite: !asset.isFavorite
      })
      onInventoryChange(updatedInventory)
    }
  }, [inventory, onInventoryChange])

  // Toggle active status
  const toggleActive = useCallback((assetId: string) => {
    const asset = inventory.assets.find(a => a.id === assetId)
    if (asset) {
      const updatedInventory = digitalAssetInventoryService.updateAsset(inventory, assetId, {
        isActive: !asset.isActive
      })
      onInventoryChange(updatedInventory)
    }
  }, [inventory, onInventoryChange])

  // Delete asset
  const handleDeleteAsset = useCallback((assetId: string) => {
    const asset = inventory.assets.find(a => a.id === assetId)
    if (asset && confirm(`Are you sure you want to delete ${asset.name}?`)) {
      const updatedInventory = digitalAssetInventoryService.deleteAsset(inventory, assetId)
      onInventoryChange(updatedInventory)
      setSelectedAsset(null)
    }
  }, [inventory, onInventoryChange])

  // Export to CSV
  const handleExport = useCallback(() => {
    const csv = digitalAssetInventoryService.exportToCSV(filteredAssets)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `digital-assets-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredAssets])

  // Get asset type icon
  const getAssetTypeIcon = useCallback((type: DigitalAssetType) => {
    const iconMap = {
      online_account: Globe,
      domain_name: Globe,
      website: Globe,
      cryptocurrency: CreditCard,
      investment_account: TrendingUp,
      subscription_service: Package,
      social_media: Users,
      cloud_storage: Cloud,
      digital_collectible: Star,
      software_license: Key,
      api_key: Code,
      server: Server,
      database: Database,
      email_account: Mail,
      other: MoreVertical
    }
    return iconMap[type] || MoreVertical
  }, [])

  // Get importance color
  const getImportanceColor = useCallback((importance: ImportanceLevel) => {
    switch (importance) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
    }
  }, [])

  // Format currency
  const formatCurrency = useCallback((amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }, [])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Digital Asset Inventory</h2>
          </div>
          <div className="flex items-center space-x-2">
            {activeAlerts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Alerts
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeAlerts.length}
                </span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{inventory.statistics.totalAssets}</div>
            <div className="text-sm text-blue-800">Total Assets</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {totalValue ? formatCurrency(totalValue.amount, totalValue.currency) : '-'}
            </div>
            <div className="text-sm text-green-800">Total Value</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {recurringCosts.monthly ? formatCurrency(recurringCosts.monthly.amount, recurringCosts.monthly.currency) : '-'}
            </div>
            <div className="text-sm text-yellow-800">Monthly Costs</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{inventory.statistics.expiringAssets}</div>
            <div className="text-sm text-red-800">Expiring Soon</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{inventory.statistics.criticalAssets}</div>
            <div className="text-sm text-purple-800">Critical Assets</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {showAlerts && activeAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-2">
          <h3 className="font-medium mb-2">Active Alerts</h3>
          {activeAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg flex items-start justify-between ${
                alert.severity === 'critical' ? 'bg-red-50' :
                alert.severity === 'warning' ? 'bg-yellow-50' :
                'bg-blue-50'
              }`}
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{alert.title}</div>
                <div className="text-sm text-gray-600 mt-1">{alert.message}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const updatedInventory = digitalAssetInventoryService.resolveAlert(inventory, alert.id)
                  onInventoryChange(updatedInventory)
                }}
              >
                Dismiss
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filter.type || 'all'}
            onChange={(e) => setFilter(prev => ({ 
              ...prev, 
              type: e.target.value === 'all' ? undefined : e.target.value as DigitalAssetType 
            }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {inventory.types.map(type => (
              <option key={type} value={type}>
                {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filter.category || 'all'}
            onChange={(e) => setFilter(prev => ({ 
              ...prev, 
              category: e.target.value === 'all' ? undefined : e.target.value as DigitalAssetCategory 
            }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {inventory.categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
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
            <option value="type">Sort by Type</option>
            <option value="category">Sort by Category</option>
            <option value="value">Sort by Value</option>
            <option value="expiry">Sort by Expiry</option>
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
            variant={filter.importance === 'critical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(prev => ({ 
              ...prev, 
              importance: prev.importance === 'critical' ? undefined : 'critical' 
            }))}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Critical
          </Button>
          <Button
            variant={filter.isActive !== undefined && filter.isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(prev => ({ 
              ...prev, 
              isActive: prev.isActive === true ? undefined : true 
            }))}
          >
            <Shield className="h-4 w-4 mr-1" />
            Active Only
          </Button>
          <Button
            variant={filter.hasValue ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(prev => ({ 
              ...prev, 
              hasValue: prev.hasValue ? undefined : true 
            }))}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Has Value
          </Button>
          <Button
            variant={filter.expiringDays === 30 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(prev => ({ 
              ...prev, 
              expiringDays: prev.expiringDays === 30 ? undefined : 30 
            }))}
          >
            <Clock className="h-4 w-4 mr-1" />
            Expiring Soon
          </Button>
        </div>
      </div>

      {/* Asset Grid/List */}
      <div className="bg-white rounded-lg shadow-sm border min-h-[400px]">
        {filteredAssets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No assets found</p>
            <p>
              {searchTerm || filter.type || filter.category 
                ? 'Try adjusting your search or filters.' 
                : 'Add your first digital asset to get started.'
              }
            </p>
            {!searchTerm && !filter.type && !filter.category && (
              <Button
                onClick={() => setShowAddForm(true)}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Asset
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onToggleFavorite={() => toggleFavorite(asset.id)}
                onToggleActive={() => toggleActive(asset.id)}
                onView={() => setViewingAsset(asset.id)}
                onEdit={() => setSelectedAsset(asset.id)}
                onDelete={() => handleDeleteAsset(asset.id)}
                getAssetTypeIcon={getAssetTypeIcon}
                getImportanceColor={getImportanceColor}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAssets.map((asset) => (
              <AssetListItem
                key={asset.id}
                asset={asset}
                onToggleFavorite={() => toggleFavorite(asset.id)}
                onToggleActive={() => toggleActive(asset.id)}
                onView={() => setViewingAsset(asset.id)}
                onEdit={() => setSelectedAsset(asset.id)}
                onDelete={() => handleDeleteAsset(asset.id)}
                getAssetTypeIcon={getAssetTypeIcon}
                getImportanceColor={getImportanceColor}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || selectedAsset) && (
        <DigitalAssetForm
          asset={selectedAsset ? inventory.assets.find(a => a.id === selectedAsset) : undefined}
          inventory={inventory}
          onSave={(assetData) => {
            if (selectedAsset) {
              const updatedInventory = digitalAssetInventoryService.updateAsset(inventory, selectedAsset, assetData)
              onInventoryChange(updatedInventory)
            } else {
              const updatedInventory = digitalAssetInventoryService.addAsset(inventory, assetData)
              onInventoryChange(updatedInventory)
            }
            setShowAddForm(false)
            setSelectedAsset(null)
          }}
          onCancel={() => {
            setShowAddForm(false)
            setSelectedAsset(null)
          }}
        />
      )}

      {/* Asset Detail View Modal */}
      {viewingAsset && (
        <DigitalAssetDetailView
          asset={inventory.assets.find(a => a.id === viewingAsset)!}
          inventory={inventory}
          onClose={() => setViewingAsset(null)}
          onEdit={() => {
            setSelectedAsset(viewingAsset)
            setViewingAsset(null)
          }}
          onDelete={() => {
            handleDeleteAsset(viewingAsset)
            setViewingAsset(null)
          }}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <DigitalAssetImportModal
          inventory={inventory}
          onImport={(updatedInventory) => {
            onInventoryChange(updatedInventory)
            setShowImportModal(false)
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  )
}

// Asset Card Component for Grid View
interface AssetCardProps {
  asset: DigitalAsset
  onToggleFavorite: () => void
  onToggleActive: () => void
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  getAssetTypeIcon: (type: DigitalAssetType) => any
  getImportanceColor: (importance: ImportanceLevel) => string
  formatCurrency: (amount: number, currency: string) => string
}

function AssetCard({
  asset,
  onToggleFavorite,
  onToggleActive,
  onView,
  onEdit,
  onDelete,
  getAssetTypeIcon,
  getImportanceColor,
  formatCurrency
}: AssetCardProps) {
  const Icon = getAssetTypeIcon(asset.type)

  return (
    <div 
      className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
        !asset.isActive ? 'opacity-60' : ''
      }`}
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
            <Icon className="h-5 w-5 text-gray-600" />
          </div>

          <h3 className="font-medium text-sm truncate" title={asset.name}>
            {asset.name}
          </h3>
          
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>{asset.category}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(asset.importance)}`}>
              {asset.importance}
            </span>
          </div>
        </div>

        <div className="flex flex-col space-y-1">
          {asset.isFavorite && (
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          )}
          {asset.expiryDate && new Date(asset.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
            <Clock className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Value */}
      {asset.value && (
        <div className="text-sm font-medium text-gray-900 mb-2">
          {formatCurrency(asset.value.amount, asset.value.currency)}
        </div>
      )}

      {/* Monthly Cost */}
      {asset.costs?.type === 'recurring' && asset.costs.frequency === 'monthly' && (
        <div className="text-xs text-gray-500 mb-2">
          {formatCurrency(asset.costs.amount, asset.costs.currency)}/mo
        </div>
      )}

      {/* Tags */}
      {asset.tags && asset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {asset.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
            >
              {tag}
            </span>
          ))}
          {asset.tags.length > 2 && (
            <span className="text-xs text-gray-500">+{asset.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center" onClick={e => e.stopPropagation()}>
        <div className="flex space-x-1">
          <Button variant="ghost" size="sm" onClick={onToggleFavorite}>
            {asset.isFavorite ? (
              <StarOff className="h-3 w-3" />
            ) : (
              <Star className="h-3 w-3" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleActive}>
            <Shield className={`h-3 w-3 ${asset.isActive ? 'text-green-600' : 'text-gray-400'}`} />
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

// Asset List Item Component for List View  
type AssetListItemProps = AssetCardProps

function AssetListItem({
  asset,
  onToggleFavorite,
  onToggleActive,
  onView,
  onEdit,
  onDelete,
  getAssetTypeIcon,
  getImportanceColor,
  formatCurrency
}: AssetListItemProps) {
  const Icon = getAssetTypeIcon(asset.type)

  return (
    <div 
      className={`p-4 hover:bg-gray-50 flex items-center space-x-4 cursor-pointer ${
        !asset.isActive ? 'opacity-60' : ''
      }`}
      onClick={onView}>
      {/* Icon */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-gray-900 truncate">
            {asset.name}
          </h3>
          {asset.isFavorite && (
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          )}
          {asset.expiryDate && new Date(asset.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
            <Clock className="h-4 w-4 text-red-500" />
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(asset.importance)}`}>
            {asset.importance}
          </span>
        </div>
        
        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
          <span>{asset.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
          <span>{asset.category}</span>
          {asset.value && (
            <span className="font-medium text-gray-900">
              {formatCurrency(asset.value.amount, asset.value.currency)}
            </span>
          )}
          {asset.costs?.type === 'recurring' && (
            <span>
              {formatCurrency(asset.costs.amount, asset.costs.currency)}/{asset.costs.frequency}
            </span>
          )}
        </div>
        
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.slice(0, 3).map(tag => (
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

      <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" onClick={onToggleFavorite}>
          {asset.isFavorite ? (
            <StarOff className="h-4 w-4" />
          ) : (
            <Star className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggleActive}>
          <Shield className={`h-4 w-4 ${asset.isActive ? 'text-green-600' : 'text-gray-400'}`} />
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