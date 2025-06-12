'use client'

import { useState, useCallback, useMemo } from 'react'
import { 
  Plus, 
  Search, 
  Eye, 
  EyeOff, 
  Copy, 
  Edit, 
  Trash2, 
  Star, 
  StarOff,
  Settings,
  Key
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PasswordEntry, PasswordVault as PasswordVaultType, PasswordCategory, PasswordStrength } from '@/types/data'
import { passwordVaultService } from '@/services/password-vault-service'

interface PasswordVaultProps {
  vault: PasswordVaultType
  onVaultChange: (vault: PasswordVaultType) => void
  className?: string
}

type SortBy = 'name' | 'category' | 'strength' | 'updated' | 'created'

export default function PasswordVault({ vault, onVaultChange, className = '' }: PasswordVaultProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<PasswordCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [showPasswords, setShowPasswords] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let entries = passwordVaultService.searchEntries(vault, searchTerm)
    entries = passwordVaultService.filterByCategory(vault, selectedCategory)
    
    // Apply search filter again after category filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      entries = entries.filter(entry => 
        entry.serviceName.toLowerCase().includes(searchLower) ||
        entry.username.toLowerCase().includes(searchLower) ||
        entry.email?.toLowerCase().includes(searchLower) ||
        entry.url?.toLowerCase().includes(searchLower) ||
        entry.notes?.toLowerCase().includes(searchLower) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Sort entries
    entries.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.serviceName.localeCompare(b.serviceName)
        case 'category':
          return a.category.localeCompare(b.category)
        case 'strength':
          return (b.strength?.score ?? 0) - (a.strength?.score ?? 0)
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

    return entries
  }, [vault, searchTerm, selectedCategory, sortBy])

  // Copy password to clipboard
  const handleCopyPassword = useCallback(async (password: string) => {
    try {
      await passwordVaultService.copyToClipboard(password, vault.settings.security.clearClipboardSeconds)
      // Show temporary success message (you could add a toast here)
    } catch (error) {
      console.error('Failed to copy password:', error)
    }
  }, [vault.settings.security.clearClipboardSeconds])

  // Toggle password visibility for specific entry
  const togglePasswordVisibility = useCallback((entryId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }, [])

  // Toggle favorite status
  const toggleFavorite = useCallback((entryId: string) => {
    const entry = vault.entries.find(e => e.id === entryId)
    if (entry) {
      const updatedVault = passwordVaultService.updateEntry(vault, entryId, {
        isFavorite: !entry.isFavorite
      })
      onVaultChange(updatedVault)
    }
  }, [vault, onVaultChange])

  // Delete entry
  const handleDeleteEntry = useCallback((entryId: string) => {
    if (confirm('Are you sure you want to delete this password entry?')) {
      const updatedVault = passwordVaultService.deleteEntry(vault, entryId)
      onVaultChange(updatedVault)
      setSelectedEntry(null)
    }
  }, [vault, onVaultChange])

  // Generate password
  const generatePassword = useCallback(() => {
    return passwordVaultService.generatePassword(vault.settings.passwordGenerator)
  }, [vault.settings.passwordGenerator])

  // Get strength color
  const getStrengthColor = useCallback((strength?: PasswordStrength) => {
    if (!strength) return 'gray'
    switch (strength.score) {
      case 0: return 'red'
      case 1: return 'orange'
      case 2: return 'yellow'
      case 3: return 'blue'
      case 4: return 'green'
      default: return 'gray'
    }
  }, [])

  // Get strength label
  const getStrengthLabel = useCallback((strength?: PasswordStrength) => {
    if (!strength) return 'Unknown'
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    return labels[strength.score] || 'Unknown'
  }, [])

  // Get category icon
  const getCategoryIcon = useCallback((category: PasswordCategory) => {
    const iconMap = {
      personal: '👤',
      business: '💼',
      financial: '💰',
      social: '👥',
      shopping: '🛒',
      entertainment: '🎬',
      utilities: '⚡',
      healthcare: '🏥',
      education: '🎓',
      other: '📋'
    }
    return iconMap[category] || '📋'
  }, [])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Key className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Password Vault</h2>
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
              <Plus className="h-4 w-4 mr-2" />
              Add Password
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{vault.statistics.totalEntries}</div>
            <div className="text-sm text-blue-800">Total Passwords</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{vault.statistics.weakPasswords}</div>
            <div className="text-sm text-red-800">Weak Passwords</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{vault.statistics.duplicatePasswords}</div>
            <div className="text-sm text-yellow-800">Duplicates</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{vault.statistics.expiredPasswords}</div>
            <div className="text-sm text-orange-800">Expired</div>
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
              placeholder="Search passwords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as PasswordCategory | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {vault.categories.map(category => (
              <option key={category} value={category}>
                {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
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
            <option value="strength">Sort by Strength</option>
            <option value="updated">Sort by Updated</option>
            <option value="created">Sort by Created</option>
          </select>

          {/* Show Passwords Toggle */}
          <Button
            variant={showPasswords ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPasswords(!showPasswords)}
          >
            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Password List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Key className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No passwords found</p>
            <p>
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'Add your first password to get started.'
              }
            </p>
            {!searchTerm && selectedCategory === 'all' && (
              <Button
                onClick={() => setShowAddForm(true)}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Password
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEntries.map((entry) => (
              <PasswordEntryRow
                key={entry.id}
                entry={entry}
                showPassword={showPasswords || visiblePasswords.has(entry.id)}
                onTogglePasswordVisibility={() => togglePasswordVisibility(entry.id)}
                onCopyPassword={() => handleCopyPassword(entry.password)}
                onToggleFavorite={() => toggleFavorite(entry.id)}
                onEdit={() => setSelectedEntry(entry.id)}
                onDelete={() => handleDeleteEntry(entry.id)}
                getStrengthColor={getStrengthColor}
                getStrengthLabel={getStrengthLabel}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || selectedEntry) && (
        <PasswordEntryForm
          entry={selectedEntry ? vault.entries.find(e => e.id === selectedEntry) : undefined}
          vault={vault}
          onSave={(entryData) => {
            if (selectedEntry) {
              const updatedVault = passwordVaultService.updateEntry(vault, selectedEntry, entryData)
              onVaultChange(updatedVault)
            } else {
              const updatedVault = passwordVaultService.addEntry(vault, entryData)
              onVaultChange(updatedVault)
            }
            setShowAddForm(false)
            setSelectedEntry(null)
          }}
          onCancel={() => {
            setShowAddForm(false)
            setSelectedEntry(null)
          }}
          generatePassword={generatePassword}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <PasswordVaultSettings
          vault={vault}
          onSave={(updatedVault) => {
            onVaultChange(updatedVault)
            setShowSettings(false)
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

// Password Entry Row Component
interface PasswordEntryRowProps {
  entry: PasswordEntry
  showPassword: boolean
  onTogglePasswordVisibility: () => void
  onCopyPassword: () => void
  onToggleFavorite: () => void
  onEdit: () => void
  onDelete: () => void
  getStrengthColor: (strength?: PasswordStrength) => string
  getStrengthLabel: (strength?: PasswordStrength) => string
  getCategoryIcon: (category: PasswordCategory) => string
}

function PasswordEntryRow({
  entry,
  showPassword,
  onTogglePasswordVisibility,
  onCopyPassword,
  onToggleFavorite,
  onEdit,
  onDelete,
  getStrengthColor,
  getStrengthLabel,
  getCategoryIcon
}: PasswordEntryRowProps) {
  const strengthColor = getStrengthColor(entry.strength)
  const strengthLabel = getStrengthLabel(entry.strength)

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <div className="text-lg">{getCategoryIcon(entry.category)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900 truncate">
                  {entry.serviceName}
                </h3>
                {entry.isFavorite && (
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                )}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  strengthColor === 'red' ? 'bg-red-100 text-red-800' :
                  strengthColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                  strengthColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  strengthColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                  strengthColor === 'green' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {strengthLabel}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span>{entry.username}</span>
                {entry.email && <span>{entry.email}</span>}
                {entry.url && (
                  <a 
                    href={entry.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {new URL(entry.url).hostname}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {/* Password field */}
          <div className="flex items-center space-x-2">
            <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded min-w-[120px]">
              {showPassword ? entry.password : '••••••••'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePasswordVisibility}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyPassword}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFavorite}
            >
              {entry.isFavorite ? (
                <StarOff className="h-4 w-4" />
              ) : (
                <Star className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {entry.notes && (
        <div className="mt-2 text-sm text-gray-600">
          {entry.notes}
        </div>
      )}

      {entry.tags && entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.tags.map(tag => (
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
  )
}

// Password Entry Form - placeholder for future implementation
interface PasswordEntryFormProps {
  entry?: PasswordEntry;
  vault: PasswordVaultType;
  onSave: (data: any) => void;
  onCancel: () => void;
}

function PasswordEntryForm({ entry, onSave, onCancel }: PasswordEntryFormProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          {entry ? 'Edit Password' : 'Add Password'}
        </h3>
        <p className="text-gray-600">Password form would go here...</p>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave({})}>Save</Button>
        </div>
      </div>
    </div>
  )
}

// Settings Modal - placeholder for future implementation
function PasswordVaultSettings({ vault, onSave, onCancel }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Vault Settings</h3>
        <p className="text-gray-600">Settings form would go here...</p>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(vault)}>Save</Button>
        </div>
      </div>
    </div>
  )
}