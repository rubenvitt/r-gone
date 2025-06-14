'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity, AlertTriangle, CheckCircle, Clock, 
  Zap, Settings, History, PlayCircle, PauseCircle,
  RefreshCw, Info, Calendar, BarChart3, Shield,
  AlertCircle, FileText, Users, Smartphone, User
} from 'lucide-react'
import { format } from 'date-fns'

interface EvaluationResult {
  triggerId: string
  triggered: boolean
  confidence: number
  reason: string
  requiredActions: string[]
  metadata: Record<string, any>
  timestamp: string
}

interface EvaluationSchedule {
  userId: string
  frequency: 'realtime' | 'minute' | 'hourly' | 'daily' | 'weekly'
  lastRun?: string
  nextRun: string
  enabled: boolean
}

interface EvaluationRule {
  id: string
  name: string
  description: string
  priority: number
  enabled: boolean
}

interface EvaluationStats {
  totalEvaluations: number
  recentTriggers: number
}

export function TriggerEvaluationManager() {
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [schedule, setSchedule] = useState<EvaluationSchedule | null>(null)
  const [history, setHistory] = useState<EvaluationResult[]>([])
  const [rules, setRules] = useState<EvaluationRule[]>([])
  const [stats, setStats] = useState<EvaluationStats>({ totalEvaluations: 0, recentTriggers: 0 })
  const [selectedTab, setSelectedTab] = useState('overview')
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    loadEvaluationData()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadEvaluationData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadEvaluationData = async () => {
    try {
      setLoading(true)
      
      // Load evaluation history and schedule
      const [historyRes, scheduleRes, rulesRes] = await Promise.all([
        fetch('/api/triggers/evaluate'),
        fetch('/api/triggers/schedule'),
        fetch('/api/triggers/rules')
      ])

      if (historyRes.ok) {
        const historyData = await historyRes.json()
        setHistory(historyData.history || [])
        setStats(historyData.stats || { totalEvaluations: 0, recentTriggers: 0 })
      }

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json()
        setSchedule(scheduleData.schedule)
      }

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json()
        setRules(rulesData.rules || [])
      }
    } catch (error) {
      console.error('Failed to load evaluation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const runManualEvaluation = async () => {
    try {
      setEvaluating(true)
      
      const response = await fetch('/api/triggers/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default-user',
          immediate: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Refresh data to show new results
        await loadEvaluationData()
        
        // Show summary
        alert(`Evaluation complete: ${data.summary.evaluated} triggers evaluated, ${data.summary.triggered} triggered`)
      }
    } catch (error) {
      console.error('Failed to run evaluation:', error)
    } finally {
      setEvaluating(false)
    }
  }

  const updateSchedule = async (frequency: string) => {
    try {
      const response = await fetch('/api/triggers/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default-user',
          frequency,
          enabled: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSchedule(data.schedule)
      }
    } catch (error) {
      console.error('Failed to update schedule:', error)
    }
  }

  const toggleEvaluation = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/triggers/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default-user',
          enabled
        })
      })

      if (response.ok) {
        if (schedule) {
          setSchedule({ ...schedule, enabled })
        }
      }
    } catch (error) {
      console.error('Failed to toggle evaluation:', error)
    }
  }

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/triggers/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default-user',
          ruleId,
          enabled
        })
      })

      if (response.ok) {
        setRules(rules.map(r => 
          r.id === ruleId ? { ...r, enabled } : r
        ))
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    }
  }

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'medical_emergency': return <Activity className="h-4 w-4" />
      case 'legal_document_filed': return <FileText className="h-4 w-4" />
      case 'beneficiary_petition': return <Users className="h-4 w-4" />
      case 'third_party_signal': return <Smartphone className="h-4 w-4" />
      case 'manual_override': return <User className="h-4 w-4" />
      case 'inactivity': return <Clock className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge variant="destructive">High ({(confidence * 100).toFixed(0)}%)</Badge>
    } else if (confidence >= 0.5) {
      return <Badge variant="secondary">Medium ({(confidence * 100).toFixed(0)}%)</Badge>
    } else {
      return <Badge variant="outline">Low ({(confidence * 100).toFixed(0)}%)</Badge>
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Trigger Evaluation Engine</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <Label htmlFor="auto-refresh">Auto-refresh</Label>
          </div>
          <Button 
            onClick={loadEvaluationData}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Engine Status</p>
              <p className="text-2xl font-bold flex items-center gap-2">
                {schedule?.enabled ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Active
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-5 w-5 text-gray-500" />
                    Paused
                  </>
                )}
              </p>
            </div>
            <Activity className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Evaluations</p>
              <p className="text-2xl font-bold">{stats.totalEvaluations}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Recent Triggers</p>
              <p className="text-2xl font-bold">{stats.recentTriggers}</p>
              <p className="text-xs text-gray-500">Last 24 hours</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Next Evaluation</p>
              <p className="text-sm font-medium">
                {schedule?.nextRun ? 
                  format(new Date(schedule.nextRun), 'HH:mm:ss') : 
                  'Not scheduled'
                }
              </p>
            </div>
            <Clock className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Manual Evaluation</h4>
                  <p className="text-sm text-gray-500">
                    Run a one-time evaluation of all triggers
                  </p>
                </div>
                <Button
                  onClick={runManualEvaluation}
                  disabled={evaluating}
                >
                  {evaluating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Automatic Evaluation</h4>
                  <p className="text-sm text-gray-500">
                    {schedule?.enabled ? 
                      `Running ${schedule.frequency}` : 
                      'Currently disabled'
                    }
                  </p>
                </div>
                <Switch
                  checked={schedule?.enabled || false}
                  onCheckedChange={toggleEvaluation}
                />
              </div>

              {schedule?.lastRun && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Last evaluation: {format(new Date(schedule.lastRun), 'PPpp')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Evaluation History</h3>
            
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No evaluation history available
                  </p>
                ) : (
                  history.map((result, index) => (
                    <div
                      key={`${result.triggerId}-${index}`}
                      className={`p-4 border rounded-lg ${
                        result.triggered ? 'border-orange-200 bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getTriggerIcon(result.metadata.type || '')}
                          <div>
                            <p className="font-medium">
                              {result.triggered ? 'Trigger Activated' : 'No Trigger'}
                            </p>
                            <p className="text-sm text-gray-600">{result.reason}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(result.timestamp), 'PPpp')}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getConfidenceBadge(result.confidence)}
                          {result.triggered && result.requiredActions.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {result.requiredActions.length} actions
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Evaluation Rules</h3>
            
            <div className="space-y-3">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Shield className={`h-5 w-5 ${rule.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                    <div>
                      <h4 className="font-medium">{rule.name}</h4>
                      <p className="text-sm text-gray-600">{rule.description}</p>
                      <Badge variant="outline" className="mt-1">
                        Priority: {rule.priority}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                  />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Evaluation Settings</h3>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="frequency">Evaluation Frequency</Label>
                <Select
                  value={schedule?.frequency || 'hourly'}
                  onValueChange={updateSchedule}
                >
                  <SelectTrigger id="frequency" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="minute">Every Minute</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-2">
                  How often the engine should evaluate triggers
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> Real-time evaluation may increase system load. 
                  Consider your specific requirements when choosing frequency.
                </AlertDescription>
              </Alert>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Engine Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Active Rules</p>
                    <p className="font-medium">{rules.filter(r => r.enabled).length}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Rules</p>
                    <p className="font-medium">{rules.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Evaluation Count</p>
                    <p className="font-medium">{stats.totalEvaluations}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Trigger Rate</p>
                    <p className="font-medium">
                      {stats.totalEvaluations > 0 
                        ? `${((stats.recentTriggers / stats.totalEvaluations) * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}