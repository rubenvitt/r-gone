'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  Shield,
  UserCheck,
  Send,
  Eye,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Beneficiary,
  BeneficiaryFilter,
  BeneficiaryTrustLevel,
  BeneficiaryAccessLevel,
  BeneficiaryStatus,
  InvitationStatus
} from '@/types/data'

interface BeneficiaryManagerProps {
  className?: string
}

interface BeneficiaryStats {
  totalBeneficiaries: number
  activeBeneficiaries: number
  pendingInvitations: number
  verifiedBeneficiaries: number
  beneficiariesByTrustLevel: Record<BeneficiaryTrustLevel, number>
  beneficiariesByAccessLevel: Record<BeneficiaryAccessLevel, number>
  recentAccess: number
  lastAnalysis: string
}

export default function BeneficiaryManager({ className = '' }: BeneficiaryManagerProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [statistics, setStatistics] = useState<BeneficiaryStats | null>(null)
  const [filter, setFilter] = useState<BeneficiaryFilter>({})
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  // const [showAddForm] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteBeneficiaryId, setInviteBeneficiaryId] = useState<string | null>(null)

  const loadBeneficiaries = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/beneficiaries?${params}`)
      const data = await response.json()

      if (data.success) {
        setBeneficiaries(data.beneficiaries)
        setStatistics(data.statistics)
      }
    } catch (error) {
      console.error('Failed to load beneficiaries:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadBeneficiaries()
  }, [loadBeneficiaries])

  // const handleAddBeneficiary = async (beneficiaryData: Record<string, unknown>) => {
  //   try {
  //     const response = await fetch('/api/beneficiaries', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(beneficiaryData)
  //     })

  //     const data = await response.json()
  //     if (data.success) {
  //       await loadBeneficiaries()
  //     }
  //   } catch (error) {
  //     console.error('Failed to add beneficiary:', error)
  //   }
  // }

  const handleSendInvitation = async (beneficiaryId: string, message?: string) => {
    try {
      const response = await fetch('/api/beneficiaries/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beneficiaryId, message })
      })

      const data = await response.json()
      if (data.success) {
        await loadBeneficiaries()
        setShowInviteModal(false)
        setInviteBeneficiaryId(null)
      }
    } catch (error) {
      console.error('Failed to send invitation:', error)
    }
  }

  // const handleUpdateBeneficiary = async (beneficiaryId: string, updates: Partial<Beneficiary>) => {
  //   try {
  //     const response = await fetch(`/api/beneficiaries/${beneficiaryId}`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(updates)
  //     })

  //     const data = await response.json()
  //     if (data.success) {
  //       await loadBeneficiaries()
  //     }
  //   } catch (error) {
  //     console.error('Failed to update beneficiary:', error)
  //   }
  // }

  const handleDeleteBeneficiary = async (beneficiaryId: string) => {
    if (!confirm('Are you sure you want to remove this beneficiary?')) {
      return
    }

    try {
      const response = await fetch(`/api/beneficiaries/${beneficiaryId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        await loadBeneficiaries()
      }
    } catch (error) {
      console.error('Failed to delete beneficiary:', error)
    }
  }

  const getTrustLevelColor = (trustLevel: BeneficiaryTrustLevel) => {
    switch (trustLevel) {
      case 'family': return 'text-green-600 bg-green-50'
      case 'legal': return 'text-blue-600 bg-blue-50'
      case 'business': return 'text-purple-600 bg-purple-50'
      case 'emergency': return 'text-red-600 bg-red-50'
      case 'limited': return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: BeneficiaryStatus) => {
    switch (status) {
      case 'active': return 'text-green-600'
      case 'inactive': return 'text-yellow-600'
      case 'suspended': return 'text-orange-600'
      case 'revoked': return 'text-red-600'
    }
  }

  const getInvitationStatusColor = (status: InvitationStatus) => {
    switch (status) {
      case 'accepted': return 'text-green-600'
      case 'sent': return 'text-blue-600'
      case 'pending': return 'text-yellow-600'
      case 'declined': return 'text-red-600'
      case 'expired': return 'text-gray-600'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold">Beneficiary Management</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadBeneficiaries}
            disabled={isLoading}
          >
            <Shield className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => {/* TODO: implement add beneficiary */}}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Beneficiary
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Beneficiaries</p>
                <p className="text-2xl font-bold">{statistics.totalBeneficiaries}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{statistics.activeBeneficiaries}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Invitations</p>
                <p className="text-2xl font-bold text-yellow-600">{statistics.pendingInvitations}</p>
              </div>
              <Mail className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.verifiedBeneficiaries}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trust Level</label>
              <select
                value={filter.trustLevel || 'all'}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  trustLevel: e.target.value === 'all' ? undefined : e.target.value as BeneficiaryTrustLevel 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Trust Levels</option>
                <option value="family">Family</option>
                <option value="legal">Legal</option>
                <option value="business">Business</option>
                <option value="emergency">Emergency</option>
                <option value="limited">Limited</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Level</label>
              <select
                value={filter.accessLevel || 'all'}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  accessLevel: e.target.value === 'all' ? undefined : e.target.value as BeneficiaryAccessLevel 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Access Levels</option>
                <option value="full">Full</option>
                <option value="financial">Financial</option>
                <option value="medical">Medical</option>
                <option value="personal">Personal</option>
                <option value="emergency">Emergency</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filter.status || 'all'}
                onChange={(e) => setFilter(prev => ({ 
                  ...prev, 
                  status: e.target.value === 'all' ? undefined : e.target.value as BeneficiaryStatus 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={filter.search || ''}
                  onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value || undefined }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beneficiaries List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium">Beneficiaries</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trust Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invitation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {beneficiaries.map((beneficiary) => (
                <tr key={beneficiary.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {beneficiary.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {beneficiary.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                    {beneficiary.relationship.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getTrustLevelColor(beneficiary.trustLevel)}`}>
                      {beneficiary.trustLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                    {beneficiary.accessLevel}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`capitalize ${getStatusColor(beneficiary.status)}`}>
                      {beneficiary.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`capitalize ${getInvitationStatusColor(beneficiary.invitationStatus)}`}>
                      {beneficiary.invitationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedBeneficiary(beneficiary)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {beneficiary.invitationStatus === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setInviteBeneficiaryId(beneficiary.id)
                            setShowInviteModal(true)
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBeneficiary(beneficiary.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {beneficiaries.length === 0 && !isLoading && (
          <div className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No beneficiaries found</p>
            <p>Add beneficiaries to manage emergency access to your information.</p>
          </div>
        )}
      </div>

      {/* Beneficiary Detail Modal */}
      {selectedBeneficiary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Beneficiary Details</h3>
              <Button variant="ghost" onClick={() => setSelectedBeneficiary(null)}>
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{selectedBeneficiary.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedBeneficiary.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Relationship</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedBeneficiary.relationship.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trust Level</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getTrustLevelColor(selectedBeneficiary.trustLevel)}`}>
                    {selectedBeneficiary.trustLevel}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Access Level</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedBeneficiary.accessLevel}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`capitalize ${getStatusColor(selectedBeneficiary.status)}`}>
                    {selectedBeneficiary.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{new Date(selectedBeneficiary.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <p className="text-sm text-gray-900">{selectedBeneficiary.priority}</p>
                </div>
              </div>
              
              {selectedBeneficiary.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                    {selectedBeneficiary.notes}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="bg-gray-50 p-3 rounded text-xs">
                  <pre>{JSON.stringify(selectedBeneficiary.permissions, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Invitation Modal */}
      {showInviteModal && inviteBeneficiaryId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send Invitation</h3>
              <Button variant="ghost" onClick={() => setShowInviteModal(false)}>
                ×
              </Button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const message = formData.get('message') as string
              handleSendInvitation(inviteBeneficiaryId, message)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message (Optional)</label>
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Add a personal message to the invitation..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}