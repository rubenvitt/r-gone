'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { PasswordEntry, PasswordCategory, PasswordVault } from '@/types/data'
import { passwordVaultService } from '@/services/password-vault-service'
import { Eye, EyeOff, RefreshCw, Star, StarOff } from 'lucide-react'

interface PasswordEntryFormProps {
  entry?: PasswordEntry
  vault: PasswordVault
  onSave: (entryData: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt' | 'strength'>) => void
  onCancel: () => void
  generatePassword: () => string
}

export default function PasswordEntryForm({ 
  entry, 
  vault, 
  onSave, 
  onCancel, 
  generatePassword 
}: PasswordEntryFormProps) {
  const [formData, setFormData] = useState({
    serviceName: entry?.serviceName || '',
    username: entry?.username || '',
    email: entry?.email || '',
    password: entry?.password || '',
    url: entry?.url || '',
    notes: entry?.notes || '',
    category: entry?.category || 'personal' as PasswordCategory,
    tags: entry?.tags?.join(', ') || '',
    isFavorite: entry?.isFavorite || false,
    expiresAt: entry?.expiresAt || ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])

  const handleGeneratePassword = useCallback(() => {
    const newPassword = generatePassword()
    setFormData(prev => ({ ...prev, password: newPassword }))
    setShowPassword(true)
  }, [generatePassword])

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.serviceName.trim()) {
      newErrors.serviceName = 'Service name is required'
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.url && !/^https?:\/\/.+/.test(formData.url)) {
      newErrors.url = 'URL must start with http:// or https://'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const entryData = {
      serviceName: formData.serviceName.trim(),
      username: formData.username.trim(),
      email: formData.email.trim() || undefined,
      password: formData.password,
      url: formData.url.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      category: formData.category,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      isFavorite: formData.isFavorite,
      expiresAt: formData.expiresAt || undefined
    }

    onSave(entryData)
  }, [formData, validateForm, onSave])

  const strength = formData.password ? passwordVaultService.analyzePasswordStrength(formData.password) : null
  const strengthColor = strength ? (
    strength.score === 0 ? 'text-red-600' :
    strength.score === 1 ? 'text-orange-600' :
    strength.score === 2 ? 'text-yellow-600' :
    strength.score === 3 ? 'text-blue-600' :
    'text-green-600'
  ) : 'text-gray-400'

  const strengthLabel = strength ? (
    ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength.score]
  ) : 'Unknown'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {entry ? 'Edit Password' : 'Add Password'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              value={formData.serviceName}
              onChange={(e) => handleInputChange('serviceName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${ 
                errors.serviceName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Gmail, Facebook, Bank of America"
            />
            {errors.serviceName && (
              <p className="text-red-500 text-xs mt-1">{errors.serviceName}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${ 
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Username or login name"
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">{errors.username}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${ 
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full px-3 py-2 pr-20 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${ 
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter or generate password"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Generate password"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
            {strength && (
              <div className="mt-1 flex items-center space-x-2">
                <span className={`text-xs font-medium ${strengthColor}`}>
                  {strengthLabel}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-300 ${
                      strength.score === 0 ? 'bg-red-500 w-1/5' :
                      strength.score === 1 ? 'bg-orange-500 w-2/5' :
                      strength.score === 2 ? 'bg-yellow-500 w-3/5' :
                      strength.score === 3 ? 'bg-blue-500 w-4/5' :
                      'bg-green-500 w-full'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${ 
                errors.url ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="https://example.com"
            />
            {errors.url && (
              <p className="text-red-500 text-xs mt-1">{errors.url}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {vault.categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="work, important, 2fa (comma separated)"
            />
            <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiration Date
            </label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => handleInputChange('expiresAt', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Additional notes or security questions..."
            />
          </div>

          {/* Favorite */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="favorite"
              checked={formData.isFavorite}
              onChange={(e) => handleInputChange('isFavorite', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="favorite" className="text-sm text-gray-700 flex items-center cursor-pointer">
              {formData.isFavorite ? (
                <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
              ) : (
                <StarOff className="h-4 w-4 text-gray-400 mr-1" />
              )}
              Mark as favorite
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} type="button">
              Cancel
            </Button>
            <Button type="submit">
              {entry ? 'Update' : 'Add'} Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}