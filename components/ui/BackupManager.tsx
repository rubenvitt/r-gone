'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Shield, 
  Download, 
  Settings, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  RotateCcw,
  Trash2,
  Plus,
  Eye,
  HardDrive,
  Cloud
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBackup } from '@/hooks/useBackup'
import { BackupConfig, BackupEntry } from '@/services/backup-service'
import { SystemIntegrityReport, VerificationSchedule } from '@/services/backup-verification-service'

interface BackupManagerProps {
  className?: string
}

export default function BackupManager({ className = '' }: BackupManagerProps) {
  const [activeTab, setActiveTab] = useState<'backups' | 'exports' | 'config' | 'verification'>('backups')
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [exports, setExports] = useState<any[]>([])
  const [config, setConfig] = useState<BackupConfig | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [verificationReports, setVerificationReports] = useState<SystemIntegrityReport[]>([])
  const [verificationSchedule, setVerificationSchedule] = useState<VerificationSchedule | null>(null)

  const {
    isLoading,
    error,
    getConfig,
    updateConfig,
    createBackup,
    listBackups,
    deleteBackup,
    verifyBackup,
    createExport,
    listExports,
    deleteExport,
    getStats,
    generateSystemReport,
    getVerificationReports,
    getVerificationSchedule,
    updateVerificationSchedule,
    performMaintenance,
    clearError
  } = useBackup()

  const loadData = useCallback(async () => {
    try {
      const [
        configData,
        backupsData,
        exportsData,
        statsData,
        reportsData,
        scheduleData
      ] = await Promise.all([
        getConfig(),
        listBackups(),
        listExports(),
        getStats(),
        getVerificationReports(),
        getVerificationSchedule()
      ])

      if (configData) setConfig(configData)
      setBackups(backupsData)
      setExports(exportsData)
      if (statsData) setStats(statsData)
      setVerificationReports(reportsData)
      if (scheduleData) setVerificationSchedule(scheduleData)
    } catch (error) {
      console.error('Failed to load backup data:', error)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateBackup = async () => {
    const backup = await createBackup('manual')
    if (backup) {
      await loadData()
    }
  }

  const handleDeleteBackup = async (backupId: string) => {
    if (confirm('Are you sure you want to delete this backup?')) {
      const success = await deleteBackup(backupId)
      if (success) {
        await loadData()
      }
    }
  }

  const handleCreateExport = async () => {
    const exportId = await createExport({ includeMetadata: true })
    if (exportId) {
      await loadData()
    }
  }

  const handleUpdateConfig = async (updates: Partial<BackupConfig>) => {
    if (config) {
      const success = await updateConfig({ ...config, ...updates })
      if (success) {
        await loadData()
      }
    }
  }

  const handleGenerateReport = async () => {
    const report = await generateSystemReport({
      includeFileVerification: true,
      includeRestoreTests: false
    })
    if (report) {
      await loadData()
    }
  }

  const handlePerformMaintenance = async () => {
    if (confirm('This will delete corrupted backups and old reports. Continue?')) {
      const result = await performMaintenance()
      if (result) {
        alert(`Maintenance completed: ${result.deletedBackups} backups deleted, ${result.deletedReports} reports cleaned`)
        await loadData()
      }
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'good':
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Backup Manager</h2>
              <p className="text-gray-600">Manage your data backups and recovery options</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateBackup}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Backup</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.totalBackups}</div>
              <div className="text-sm text-gray-600">Total Backups</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">{stats.completedBackups}</div>
              <div className="text-sm text-green-600">Completed</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-900">{stats.failedBackups}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">{formatBytes(stats.totalBackupSize)}</div>
              <div className="text-sm text-blue-600">Total Size</div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-6 pt-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'backups', label: 'Backups', icon: HardDrive },
            { id: 'exports', label: 'Exports', icon: Download },
            { id: 'config', label: 'Settings', icon: Settings },
            { id: 'verification', label: 'Verification', icon: CheckCircle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'backups' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">System Backups</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateBackup}
                disabled={isLoading}
              >
                Create Manual Backup
              </Button>
            </div>

            <div className="space-y-2">
              {backups.map((backup) => (
                <div key={backup.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(backup.status)}
                      <div>
                        <div className="font-medium">
                          {backup.type === 'automatic' ? 'Automatic' : 'Manual'} Backup
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(backup.timestamp)} • {backup.fileCount} files • {formatBytes(backup.totalSize)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyBackup(backup.id)}
                        disabled={isLoading}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBackup(backup.id)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {backup.error && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      Error: {backup.error}
                    </div>
                  )}
                </div>
              ))}

              {backups.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No backups found. Create your first backup to get started.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'exports' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Data Exports</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateExport}
                disabled={isLoading}
              >
                Create Export
              </Button>
            </div>

            <div className="space-y-2">
              {exports.map((exportItem) => (
                <div key={exportItem.exportId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Export {exportItem.exportId.slice(0, 8)}</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(exportItem.timestamp)} • {exportItem.fileCount} files • {formatBytes(exportItem.size)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteExport(exportItem.exportId)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {exports.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No exports found. Create an export to download your data.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && config && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Backup Configuration</h3>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Automatic Backups
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => handleUpdateConfig({ enabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">
                      Enable automatic backup creation
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backup Interval (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={config.interval}
                    onChange={(e) => handleUpdateConfig({ interval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retention Period (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={config.retentionDays}
                    onChange={(e) => handleUpdateConfig({ retentionDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Backups
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={config.maxBackups}
                    onChange={(e) => handleUpdateConfig({ maxBackups: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compression
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config.compressionEnabled}
                      onChange={(e) => handleUpdateConfig({ compressionEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">
                      Enable backup compression
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backup Encryption
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config.encryptionEnabled}
                      onChange={(e) => handleUpdateConfig({ encryptionEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">
                      Enable additional backup encryption
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-md font-semibold mb-4">Cloud Backup (Coming Soon)</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Cloud className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-700">Cloud Integration</div>
                    <div className="text-sm text-gray-600">
                      AWS S3, Google Cloud, and Azure support will be available in a future update
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Backup Verification</h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateReport}
                  disabled={isLoading}
                >
                  Generate Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePerformMaintenance}
                  disabled={isLoading}
                >
                  Run Maintenance
                </Button>
              </div>
            </div>

            {/* Latest Report */}
            {verificationReports.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Latest System Health Report</h4>
                  <div className="flex items-center space-x-2">
                    {getHealthIcon(verificationReports[0].systemHealth)}
                    <span className="text-sm font-medium capitalize">
                      {verificationReports[0].systemHealth}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-lg font-semibold">{verificationReports[0].validBackups}</div>
                    <div className="text-sm text-gray-600">Valid Backups</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-red-600">{verificationReports[0].corruptedBackups}</div>
                    <div className="text-sm text-gray-600">Corrupted</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{verificationReports[0].totalFiles}</div>
                    <div className="text-sm text-gray-600">Total Files</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-red-600">{verificationReports[0].corruptedFiles}</div>
                    <div className="text-sm text-gray-600">Corrupted Files</div>
                  </div>
                </div>

                {verificationReports[0].recommendations.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-2">Recommendations:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {verificationReports[0].recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Verification Schedule */}
            {verificationSchedule && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">Verification Schedule</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enabled
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={verificationSchedule.enabled}
                        onChange={(e) => updateVerificationSchedule({
                          ...verificationSchedule,
                          enabled: e.target.checked
                        })}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">
                        Automatically verify backups
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={verificationSchedule.frequency}
                      onChange={(e) => updateVerificationSchedule({
                        ...verificationSchedule,
                        frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Previous Reports */}
            {verificationReports.length > 1 && (
              <div>
                <h4 className="font-medium mb-4">Previous Reports</h4>
                <div className="space-y-2">
                  {verificationReports.slice(1, 6).map((report, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getHealthIcon(report.systemHealth)}
                          <div>
                            <div className="font-medium">{formatDate(report.timestamp)}</div>
                            <div className="text-sm text-gray-600">
                              {report.validBackups}/{report.totalBackups} backups valid
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500 capitalize">
                          {report.systemHealth}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}