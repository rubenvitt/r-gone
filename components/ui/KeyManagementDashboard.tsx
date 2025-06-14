'use client'

import { useState, useEffect } from 'react'
import {
  Key,
  Lock,
  Unlock,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Clock,
  Activity,
  Users,
  Settings,
  HelpCircle,
  ChevronRight,
  RotateCw,
  Archive,
  UserCheck,
  Timer,
  FileKey,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContentType, KeyStatus, EncryptionAlgorithm } from '@/services/key-management-service'

interface KeyMetadataDisplay {
  id: string
  type: ContentType
  algorithm: EncryptionAlgorithm
  status: KeyStatus
  createdAt: string
  lastUsed: string
  version: number
  rotationDue?: string
}

interface KeyUsageLogDisplay {
  id: string
  keyId: string
  action: string
  timestamp: string
  success: boolean
  details?: string
}

interface EscrowRequestDisplay {
  id: string
  reason: string
  status: string
  createdAt: string
  approvals: number
  requiredApprovals: number
  timeRemaining?: string
}

export default function KeyManagementDashboard() {
  const [keys, setKeys] = useState<KeyMetadataDisplay[]>([])
  const [usageLogs, setUsageLogs] = useState<KeyUsageLogDisplay[]>([])
  const [escrowRequests, setEscrowRequests] = useState<EscrowRequestDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<KeyMetadataDisplay | null>(null)
  const [showRotateDialog, setShowRotateDialog] = useState(false)
  const [showBackupDialog, setShowBackupDialog] = useState(false)
  const [showEscrowDialog, setShowEscrowDialog] = useState(false)

  // Mock data - in production, fetch from API
  useEffect(() => {
    setKeys([
      {
        id: 'key-1',
        type: ContentType.PASSWORD,
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        status: KeyStatus.ACTIVE,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        version: 1,
        rotationDue: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'key-2',
        type: ContentType.DOCUMENT,
        algorithm: EncryptionAlgorithm.RSA_4096,
        status: KeyStatus.ACTIVE,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        version: 2
      },
      {
        id: 'key-3',
        type: ContentType.MESSAGE,
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        status: KeyStatus.ROTATING,
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        version: 3
      }
    ])

    setUsageLogs([
      {
        id: 'log-1',
        keyId: 'key-1',
        action: 'USED',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        success: true
      },
      {
        id: 'log-2',
        keyId: 'key-2',
        action: 'BACKED_UP',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        success: true
      },
      {
        id: 'log-3',
        keyId: 'key-3',
        action: 'ROTATED',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        success: true,
        details: 'Scheduled rotation completed'
      }
    ])

    setEscrowRequests([
      {
        id: 'escrow-1',
        reason: 'Lost access to account',
        status: 'AWAITING_APPROVALS',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        approvals: 1,
        requiredApprovals: 3,
        timeRemaining: '22 hours'
      }
    ])

    setLoading(false)
  }, [])

  const getStatusColor = (status: KeyStatus) => {
    switch (status) {
      case KeyStatus.ACTIVE:
        return 'text-green-600 bg-green-50'
      case KeyStatus.ROTATING:
        return 'text-yellow-600 bg-yellow-50'
      case KeyStatus.EXPIRED:
        return 'text-red-600 bg-red-50'
      case KeyStatus.REVOKED:
        return 'text-gray-600 bg-gray-50'
      case KeyStatus.BACKED_UP:
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getAlgorithmIcon = (algorithm: EncryptionAlgorithm) => {
    switch (algorithm) {
      case EncryptionAlgorithm.RSA_4096:
        return FileKey
      case EncryptionAlgorithm.CRYSTALS_KYBER:
      case EncryptionAlgorithm.CRYSTALS_DILITHIUM:
        return Zap
      default:
        return Key
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))} minutes ago`
    } else if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))} hours ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const handleRotateKey = async (keyId: string) => {
    // API call to rotate key
    console.log('Rotating key:', keyId)
    setShowRotateDialog(false)
  }

  const handleBackupKey = async (keyId: string) => {
    // API call to backup key
    console.log('Backing up key:', keyId)
    setShowBackupDialog(false)
  }

  const handleCreateEscrowRequest = async (reason: string, keyIds: string[]) => {
    // API call to create escrow request
    console.log('Creating escrow request:', reason, keyIds)
    setShowEscrowDialog(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading key management dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Key Management</h2>
          <p className="text-gray-600">Manage encryption keys and security settings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {keys.filter(k => k.status === KeyStatus.ACTIVE).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {keys.length} total keys
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keys Due for Rotation</CardTitle>
            <RotateCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Within next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escrow Requests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{escrowRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              Pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Key Usage Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              Encryption operations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">Encryption Keys</TabsTrigger>
          <TabsTrigger value="escrow">Key Escrow</TabsTrigger>
          <TabsTrigger value="usage">Usage Logs</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Encryption Keys</CardTitle>
              <CardDescription>
                Manage encryption keys for different content types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {keys.map((key) => {
                  const AlgorithmIcon = getAlgorithmIcon(key.algorithm)
                  return (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedKey(key)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <AlgorithmIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{key.type} Key</h4>
                          <p className="text-sm text-gray-500">
                            {key.algorithm} • Version {key.version}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Last used</p>
                          <p className="text-sm font-medium">{formatDate(key.lastUsed)}</p>
                        </div>
                        <Badge className={getStatusColor(key.status)}>
                          {key.status}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRotateDialog(true)}
                  disabled={!selectedKey}
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Rotate Key
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBackupDialog(true)}
                  disabled={!selectedKey}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Backup Key
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escrow Tab */}
        <TabsContent value="escrow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Escrow Management</CardTitle>
              <CardDescription>
                Manage emergency key recovery requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {escrowRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No active escrow requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {escrowRequests.map((request) => (
                    <Alert key={request.id}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Escrow Request</AlertTitle>
                      <AlertDescription>
                        <div className="mt-2 space-y-2">
                          <p className="font-medium">{request.reason}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              Created {formatDate(request.createdAt)}
                            </span>
                            <Badge variant="outline">
                              {request.approvals}/{request.requiredApprovals} approvals
                            </Badge>
                          </div>
                          {request.timeRemaining && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Timer className="h-4 w-4 mr-1" />
                              {request.timeRemaining} remaining
                            </div>
                          )}
                          <Progress 
                            value={(request.approvals / request.requiredApprovals) * 100} 
                            className="h-2"
                          />
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <Button onClick={() => setShowEscrowDialog(true)}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Create Escrow Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Logs Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Usage Logs</CardTitle>
              <CardDescription>
                Monitor key usage and operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {usageLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-gray-500">Key: {log.keyId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatDate(log.timestamp)}</p>
                      {log.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500 inline" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500 inline" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Security Features</CardTitle>
              <CardDescription>
                Configure hardware tokens and quantum-resistant encryption
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertTitle>Quantum-Resistant Algorithms</AlertTitle>
                <AlertDescription>
                  Enable post-quantum cryptography to protect against future quantum computing threats.
                  <Button variant="link" className="px-0 mt-2">
                    Learn more →
                  </Button>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Hardware Token Support</h4>
                    <p className="text-sm text-gray-500">Use YubiKey or similar devices</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Biometric Key Derivation</h4>
                    <p className="text-sm text-gray-500">Generate keys from biometric data</p>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rotate Key Dialog */}
      <Dialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate Encryption Key</DialogTitle>
            <DialogDescription>
              This will generate a new key and mark the old one for expiration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Existing encrypted data will be re-encrypted with the new key.
                This process may take some time.
              </AlertDescription>
            </Alert>
            {selectedKey && (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Key Type:</span> {selectedKey.type}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Current Version:</span> {selectedKey.version}
                </p>
                <p className="text-sm">
                  <span className="font-medium">New Version:</span> {selectedKey.version + 1}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRotateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedKey && handleRotateKey(selectedKey.id)}>
              Rotate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Key Dialog */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup Encryption Key</DialogTitle>
            <DialogDescription>
              Create a secure backup of this encryption key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="backup-passphrase">Backup Passphrase</Label>
              <Input
                id="backup-passphrase"
                type="password"
                placeholder="Enter a strong passphrase"
              />
              <p className="text-xs text-gray-500 mt-1">
                This passphrase will be required to restore the key
              </p>
            </div>
            <div>
              <Label htmlFor="backup-location">Backup Location</Label>
              <Select>
                <SelectTrigger id="backup-location">
                  <SelectValue placeholder="Select backup location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local File</SelectItem>
                  <SelectItem value="cloud">Cloud Storage</SelectItem>
                  <SelectItem value="hardware">Hardware Token</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedKey && handleBackupKey(selectedKey.id)}>
              <Download className="h-4 w-4 mr-2" />
              Create Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escrow Request Dialog */}
      <Dialog open={showEscrowDialog} onOpenChange={setShowEscrowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Key Escrow Request</DialogTitle>
            <DialogDescription>
              Request emergency access to encryption keys.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="escrow-reason">Reason for Request</Label>
              <Textarea
                id="escrow-reason"
                placeholder="Explain why you need emergency access..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="escrow-keys">Select Keys</Label>
              <div className="space-y-2 mt-2">
                {keys.map((key) => (
                  <label key={key.id} className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{key.type} Key</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="time-delay">Time Delay (hours)</Label>
              <Input
                id="time-delay"
                type="number"
                defaultValue="24"
                min="1"
                max="168"
              />
              <p className="text-xs text-gray-500 mt-1">
                Keys will be accessible after this delay and approval
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEscrowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleCreateEscrowRequest('', [])}>
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}