'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  PlayCircle, CheckCircle, XCircle, Clock, 
  FileText, Download, RefreshCw, Trash2,
  Activity, Users, Smartphone, User, AlertTriangle,
  TestTube, Info, ChevronRight, ChevronDown,
  Code, BarChart3, FileDown, Play
} from 'lucide-react'
import { format } from 'date-fns'

interface TestScenario {
  id: string
  name: string
  description: string
  triggerType: string
  steps: TestStep[]
  expectedResults: ExpectedResult[]
  tags: string[]
  lastRunAt?: string
  lastResult?: TestResult
}

interface TestStep {
  action: string
  parameters: Record<string, any>
  delay?: number
  description?: string
}

interface ExpectedResult {
  field: string
  operator: string
  value: any
  description?: string
}

interface TestResult {
  scenarioId: string
  success: boolean
  executedAt: string
  duration: number
  steps: StepResult[]
  assertions: AssertionResult[]
  error?: string
  logs: string[]
}

interface StepResult {
  step: TestStep
  success: boolean
  error?: string
  executionTime: number
  output?: any
}

interface AssertionResult {
  expected: ExpectedResult
  actual: any
  passed: boolean
  message: string
}

export function TriggerTestingPanel() {
  const [loading, setLoading] = useState(false)
  const [scenarios, setScenarios] = useState<TestScenario[]>([])
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set())
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set())
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map())
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set())
  const [selectedTab, setSelectedTab] = useState('scenarios')
  const [showLogs, setShowLogs] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadScenarios()
  }, [])

  const loadScenarios = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/triggers/test/scenarios')
      
      if (response.ok) {
        const data = await response.json()
        setScenarios(data.scenarios || [])
      }
    } catch (error) {
      console.error('Failed to load test scenarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const runTest = async (scenarioId: string) => {
    try {
      setRunningTests(prev => new Set(prev).add(scenarioId))
      
      const response = await fetch('/api/triggers/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId })
      })

      if (response.ok) {
        const data = await response.json()
        setTestResults(prev => new Map(prev).set(scenarioId, data.result))
        
        // Update scenario with latest result
        setScenarios(prev => prev.map(s => 
          s.id === scenarioId 
            ? { ...s, lastRunAt: data.result.executedAt, lastResult: data.result }
            : s
        ))
      }
    } catch (error) {
      console.error('Failed to run test:', error)
    } finally {
      setRunningTests(prev => {
        const next = new Set(prev)
        next.delete(scenarioId)
        return next
      })
    }
  }

  const runSelectedTests = async () => {
    for (const scenarioId of selectedScenarios) {
      await runTest(scenarioId)
    }
  }

  const exportResults = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/triggers/test/results?format=${format}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `trigger-test-results-${Date.now()}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export results:', error)
    }
  }

  const clearResults = async () => {
    try {
      const response = await fetch('/api/triggers/test/results', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setTestResults(new Map())
        loadScenarios() // Reload to clear last results
      }
    } catch (error) {
      console.error('Failed to clear results:', error)
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
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getResultBadge = (result: TestResult) => {
    if (result.success) {
      return <Badge variant="default" className="bg-green-500">PASSED</Badge>
    } else {
      return <Badge variant="destructive">FAILED</Badge>
    }
  }

  const toggleScenarioExpanded = (scenarioId: string) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev)
      if (next.has(scenarioId)) {
        next.delete(scenarioId)
      } else {
        next.add(scenarioId)
      }
      return next
    })
  }

  const toggleShowLogs = (scenarioId: string) => {
    setShowLogs(prev => {
      const next = new Set(prev)
      if (next.has(scenarioId)) {
        next.delete(scenarioId)
      } else {
        next.add(scenarioId)
      }
      return next
    })
  }

  const renderScenarioCard = (scenario: TestScenario) => {
    const isExpanded = expandedScenarios.has(scenario.id)
    const isRunning = runningTests.has(scenario.id)
    const result = testResults.get(scenario.id) || scenario.lastResult
    const showingLogs = showLogs.has(scenario.id)

    return (
      <Card key={scenario.id} className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 w-6"
                onClick={() => toggleScenarioExpanded(scenario.id)}
              >
                {isExpanded ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </Button>
              
              <Checkbox
                checked={selectedScenarios.has(scenario.id)}
                onCheckedChange={(checked) => {
                  setSelectedScenarios(prev => {
                    const next = new Set(prev)
                    if (checked) {
                      next.add(scenario.id)
                    } else {
                      next.delete(scenario.id)
                    }
                    return next
                  })
                }}
              />
              
              {getTriggerIcon(scenario.triggerType)}
              
              <div className="flex-1">
                <h4 className="font-medium">{scenario.name}</h4>
                <p className="text-sm text-gray-600">{scenario.description}</p>
                <div className="flex gap-2 mt-1">
                  {scenario.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {result && getResultBadge(result)}
              <Button
                size="sm"
                onClick={() => runTest(scenario.id)}
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Running
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Run
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="pl-12 space-y-3">
              {/* Test Steps */}
              <div>
                <h5 className="font-medium text-sm mb-2">Test Steps:</h5>
                <div className="space-y-1">
                  {scenario.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-500">{index + 1}.</span>
                      <div>
                        <span className="font-mono text-xs">{step.action}</span>
                        {step.description && (
                          <span className="text-gray-600 ml-2">- {step.description}</span>
                        )}
                        {step.delay && (
                          <span className="text-gray-500 ml-2">(wait {step.delay}ms)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected Results */}
              <div>
                <h5 className="font-medium text-sm mb-2">Expected Results:</h5>
                <div className="space-y-1">
                  {scenario.expectedResults.map((expected, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      • {expected.description || `${expected.field} ${expected.operator} ${expected.value}`}
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Result */}
              {result && (
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-sm">Last Result:</h5>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleShowLogs(scenario.id)}
                    >
                      <Code className="h-4 w-4 mr-1" />
                      {showingLogs ? 'Hide' : 'Show'} Logs
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span>Duration: {result.duration}ms</span>
                      <span>Steps: {result.steps.filter(s => s.success).length}/{result.steps.length}</span>
                      <span>Assertions: {result.assertions.filter(a => a.passed).length}/{result.assertions.length}</span>
                    </div>

                    {/* Assertions */}
                    <div className="space-y-1">
                      {result.assertions.map((assertion, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          {assertion.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={assertion.passed ? 'text-green-700' : 'text-red-700'}>
                            {assertion.message}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Logs */}
                    {showingLogs && result.logs.length > 0 && (
                      <div className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {result.logs.join('\n')}
                        </pre>
                      </div>
                    )}

                    {/* Error */}
                    {result.error && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    )
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
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TestTube className="h-6 w-6" />
          Trigger Testing Tools
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadScenarios}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportResults('csv')}>
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportResults('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Test Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Scenarios</p>
              <p className="text-2xl font-bold">{scenarios.length}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tests Run</p>
              <p className="text-2xl font-bold">{testResults.size}</p>
            </div>
            <PlayCircle className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Passed</p>
              <p className="text-2xl font-bold text-green-600">
                {Array.from(testResults.values()).filter(r => r.success).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">
                {Array.from(testResults.values()).filter(r => !r.success).length}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="results">Recent Results</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Report</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Available Test Scenarios</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedScenarios.size === scenarios.length) {
                      setSelectedScenarios(new Set())
                    } else {
                      setSelectedScenarios(new Set(scenarios.map(s => s.id)))
                    }
                  }}
                >
                  {selectedScenarios.size === scenarios.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  size="sm"
                  disabled={selectedScenarios.size === 0}
                  onClick={runSelectedTests}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Selected ({selectedScenarios.size})
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {scenarios.map(scenario => renderScenarioCard(scenario))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Test Results</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={clearResults}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Results
              </Button>
            </div>

            {testResults.size === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No test results yet</p>
                <p className="text-sm">Run some tests to see results here</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {Array.from(testResults.entries()).map(([scenarioId, result]) => {
                    const scenario = scenarios.find(s => s.id === scenarioId)
                    return (
                      <Card key={scenarioId} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{scenario?.name || scenarioId}</h4>
                            <p className="text-sm text-gray-600">
                              Executed: {format(new Date(result.executedAt), 'PPpp')}
                            </p>
                            <p className="text-sm text-gray-600">
                              Duration: {result.duration}ms
                            </p>
                          </div>
                          {getResultBadge(result)}
                        </div>
                        
                        {!result.success && result.error && (
                          <Alert variant="destructive" className="mt-3">
                            <AlertDescription>{result.error}</AlertDescription>
                          </Alert>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="coverage">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Test Coverage Report</h3>
            
            <div className="space-y-4">
              {/* Coverage by Trigger Type */}
              <div>
                <h4 className="font-medium mb-3">Coverage by Trigger Type</h4>
                <div className="space-y-3">
                  {['medical_emergency', 'legal_document_filed', 'beneficiary_petition', 
                    'third_party_signal', 'manual_override', 'inactivity'].map(type => {
                    const typeScenarios = scenarios.filter(s => s.triggerType === type)
                    const tested = typeScenarios.filter(s => 
                      testResults.has(s.id) || s.lastResult
                    ).length
                    const coverage = typeScenarios.length > 0 
                      ? (tested / typeScenarios.length) * 100 
                      : 0
                    
                    return (
                      <div key={type} className="flex items-center gap-3">
                        {getTriggerIcon(type)}
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{type.replace('_', ' ')}</span>
                            <span className="text-sm text-gray-600">
                              {tested}/{typeScenarios.length} scenarios
                            </span>
                          </div>
                          <Progress value={coverage} className="h-2" />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {coverage.toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Overall Statistics */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Overall Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Scenarios</p>
                    <p className="font-medium text-lg">{scenarios.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Scenarios Tested</p>
                    <p className="font-medium text-lg">
                      {scenarios.filter(s => testResults.has(s.id) || s.lastResult).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pass Rate</p>
                    <p className="font-medium text-lg text-green-600">
                      {testResults.size > 0 
                        ? `${((Array.from(testResults.values()).filter(r => r.success).length / testResults.size) * 100).toFixed(0)}%`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Avg Duration</p>
                    <p className="font-medium text-lg">
                      {testResults.size > 0
                        ? `${Math.round(Array.from(testResults.values()).reduce((sum, r) => sum + r.duration, 0) / testResults.size)}ms`
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