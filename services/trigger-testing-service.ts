import { triggerConditionsService, TriggerCondition, TriggerType, TriggerStatus, TriggerPriority } from './trigger-conditions-service'
import { medicalEmergencyIntegrationService } from './medical-emergency-integration-service'
import { legalDocumentDetectionService, LegalDocumentType } from './legal-document-detection-service'
import { beneficiaryPetitionService, PetitionType, PetitionUrgency } from './beneficiary-petition-service'
import { thirdPartyIntegrationService, ThirdPartySignalType } from './third-party-integration-service'
import { manualOverrideService, OverrideType, OverridePriority } from './manual-override-service'
import { deadManSwitchService } from './dead-man-switch-service'
import { triggerEvaluationEngine } from './trigger-evaluation-engine'
import { auditLoggingService } from './audit-logging-service'

export interface TestScenario {
  id: string
  name: string
  description: string
  triggerType: TriggerType
  steps: TestStep[]
  expectedResults: ExpectedResult[]
  tags: string[]
  createdAt: Date
  lastRunAt?: Date
  lastResult?: TestResult
}

export interface TestStep {
  action: string
  parameters: Record<string, any>
  delay?: number // milliseconds
  description?: string
}

export interface ExpectedResult {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists'
  value: any
  description?: string
}

export interface TestResult {
  scenarioId: string
  success: boolean
  executedAt: Date
  duration: number // milliseconds
  steps: StepResult[]
  assertions: AssertionResult[]
  error?: string
  logs: string[]
}

export interface StepResult {
  step: TestStep
  success: boolean
  error?: string
  executionTime: number
  output?: any
}

export interface AssertionResult {
  expected: ExpectedResult
  actual: any
  passed: boolean
  message: string
}

export interface TestSuite {
  id: string
  name: string
  description: string
  scenarios: string[] // scenario IDs
  schedule?: TestSchedule
  notifications: NotificationConfig
}

export interface TestSchedule {
  frequency: 'manual' | 'hourly' | 'daily' | 'weekly'
  lastRun?: Date
  nextRun?: Date
  enabled: boolean
}

export interface NotificationConfig {
  onFailure: boolean
  onSuccess: boolean
  recipients: string[]
}

export class TriggerTestingService {
  private testScenarios: Map<string, TestScenario> = new Map()
  private testSuites: Map<string, TestSuite> = new Map()
  private testResults: Map<string, TestResult[]> = new Map()
  private runningTests: Set<string> = new Set()

  constructor() {
    this.initializeDefaultScenarios()
  }

  /**
   * Initialize default test scenarios
   */
  private initializeDefaultScenarios(): void {
    const scenarios: TestScenario[] = [
      // Medical Emergency Test
      {
        id: 'medical-emergency-critical',
        name: 'Critical Medical Emergency Detection',
        description: 'Test critical medical emergency trigger with immediate response',
        triggerType: TriggerType.MEDICAL_EMERGENCY,
        steps: [
          {
            action: 'createMedicalDevice',
            parameters: {
              deviceType: 'heart_monitor',
              thresholds: { heartRateMin: 40, heartRateMax: 200 }
            },
            description: 'Set up heart monitor device'
          },
          {
            action: 'simulateMedicalEmergency',
            parameters: {
              type: 'cardiac_arrest',
              severity: 'critical',
              vitals: { heartRate: 0, bloodPressure: '0/0' }
            },
            delay: 1000,
            description: 'Simulate cardiac arrest'
          },
          {
            action: 'evaluateTriggers',
            parameters: {},
            delay: 500,
            description: 'Run trigger evaluation'
          }
        ],
        expectedResults: [
          {
            field: 'triggered',
            operator: 'equals',
            value: true,
            description: 'Trigger should activate'
          },
          {
            field: 'confidence',
            operator: 'greater_than',
            value: 0.9,
            description: 'High confidence for critical emergency'
          },
          {
            field: 'actions',
            operator: 'contains',
            value: 'GRANT_ACCESS',
            description: 'Should grant immediate access'
          }
        ],
        tags: ['medical', 'critical', 'immediate'],
        createdAt: new Date()
      },

      // Legal Document Test
      {
        id: 'legal-death-certificate',
        name: 'Death Certificate Verification',
        description: 'Test legal document trigger with death certificate',
        triggerType: TriggerType.LEGAL_DOCUMENT_FILED,
        steps: [
          {
            action: 'submitLegalDocument',
            parameters: {
              type: LegalDocumentType.DEATH_CERTIFICATE,
              jurisdiction: 'CA',
              caseNumber: 'TEST-001'
            },
            description: 'Submit death certificate'
          },
          {
            action: 'verifyDocument',
            parameters: {
              documentType: LegalDocumentType.DEATH_CERTIFICATE,
              autoApprove: true
            },
            delay: 2000,
            description: 'Verify the document'
          },
          {
            action: 'evaluateTriggers',
            parameters: {},
            delay: 1000,
            description: 'Run trigger evaluation'
          }
        ],
        expectedResults: [
          {
            field: 'triggered',
            operator: 'equals',
            value: true,
            description: 'Should trigger on verified death certificate'
          },
          {
            field: 'confidence',
            operator: 'equals',
            value: 1.0,
            description: 'Maximum confidence for verified legal document'
          }
        ],
        tags: ['legal', 'death-certificate', 'verification'],
        createdAt: new Date()
      },

      // Beneficiary Petition Test
      {
        id: 'beneficiary-multiple-petitions',
        name: 'Multiple Beneficiary Petitions',
        description: 'Test trigger with multiple urgent beneficiary petitions',
        triggerType: TriggerType.BENEFICIARY_PETITION,
        steps: [
          {
            action: 'createBeneficiary',
            parameters: {
              name: 'Test Beneficiary 1',
              relationship: 'spouse'
            },
            description: 'Create first beneficiary'
          },
          {
            action: 'createBeneficiary',
            parameters: {
              name: 'Test Beneficiary 2',
              relationship: 'child'
            },
            description: 'Create second beneficiary'
          },
          {
            action: 'createBeneficiary',
            parameters: {
              name: 'Test Beneficiary 3',
              relationship: 'child'
            },
            description: 'Create third beneficiary'
          },
          {
            action: 'submitPetition',
            parameters: {
              petitionerId: 'beneficiary-1',
              type: PetitionType.EMERGENCY_ACCESS,
              urgency: PetitionUrgency.CRITICAL,
              reason: 'Medical emergency'
            },
            delay: 500,
            description: 'First beneficiary petition'
          },
          {
            action: 'submitPetition',
            parameters: {
              petitionerId: 'beneficiary-2',
              type: PetitionType.EMERGENCY_ACCESS,
              urgency: PetitionUrgency.HIGH,
              reason: 'Cannot reach user'
            },
            delay: 500,
            description: 'Second beneficiary petition'
          },
          {
            action: 'submitPetition',
            parameters: {
              petitionerId: 'beneficiary-3',
              type: PetitionType.EMERGENCY_ACCESS,
              urgency: PetitionUrgency.HIGH,
              reason: 'Concerned about welfare'
            },
            delay: 500,
            description: 'Third beneficiary petition'
          },
          {
            action: 'evaluateTriggers',
            parameters: {},
            delay: 1000,
            description: 'Run trigger evaluation'
          }
        ],
        expectedResults: [
          {
            field: 'triggered',
            operator: 'equals',
            value: true,
            description: 'Should trigger with 3+ urgent petitions'
          },
          {
            field: 'metadata.pendingCount',
            operator: 'greater_than',
            value: 2,
            description: 'Should have multiple pending petitions'
          }
        ],
        tags: ['beneficiary', 'petition', 'multiple'],
        createdAt: new Date()
      },

      // Inactivity Test
      {
        id: 'inactivity-overdue',
        name: 'Dead Man Switch Overdue',
        description: 'Test inactivity trigger when check-in is overdue',
        triggerType: TriggerType.INACTIVITY,
        steps: [
          {
            action: 'enableDeadManSwitch',
            parameters: {
              checkInIntervalDays: 7,
              gracePeriodDays: 1
            },
            description: 'Enable dead man switch'
          },
          {
            action: 'simulateInactivity',
            parameters: {
              daysInactive: 10
            },
            delay: 1000,
            description: 'Simulate 10 days of inactivity'
          },
          {
            action: 'evaluateTriggers',
            parameters: {},
            delay: 500,
            description: 'Run trigger evaluation'
          }
        ],
        expectedResults: [
          {
            field: 'triggered',
            operator: 'equals',
            value: true,
            description: 'Should trigger when overdue'
          },
          {
            field: 'metadata.daysOverdue',
            operator: 'greater_than',
            value: 0,
            description: 'Should show days overdue'
          }
        ],
        tags: ['inactivity', 'dead-man-switch'],
        createdAt: new Date()
      },

      // Manual Override Test
      {
        id: 'manual-override-emergency',
        name: 'Emergency Manual Override',
        description: 'Test manual override with emergency authentication',
        triggerType: TriggerType.MANUAL_OVERRIDE,
        steps: [
          {
            action: 'createManualOverride',
            parameters: {
              type: OverrideType.EMERGENCY_ACCESS,
              priority: OverridePriority.EMERGENCY,
              authMethod: 'emergency_code',
              reason: 'Lost access to account'
            },
            description: 'Create emergency override'
          },
          {
            action: 'authenticateOverride',
            parameters: {
              method: 'emergency_code',
              code: 'TEST-EMERGENCY-001'
            },
            delay: 500,
            description: 'Authenticate with emergency code'
          },
          {
            action: 'evaluateTriggers',
            parameters: {},
            delay: 500,
            description: 'Run trigger evaluation'
          }
        ],
        expectedResults: [
          {
            field: 'triggered',
            operator: 'equals',
            value: true,
            description: 'Should trigger on authenticated override'
          },
          {
            field: 'confidence',
            operator: 'equals',
            value: 1.0,
            description: 'Maximum confidence for manual override'
          }
        ],
        tags: ['manual', 'override', 'emergency'],
        createdAt: new Date()
      },

      // Complex Multi-Trigger Test
      {
        id: 'multi-trigger-scenario',
        name: 'Multiple Simultaneous Triggers',
        description: 'Test evaluation with multiple active triggers',
        triggerType: TriggerType.THIRD_PARTY_SIGNAL,
        steps: [
          {
            action: 'createThirdPartySignal',
            parameters: {
              source: 'social-media',
              signalType: ThirdPartySignalType.MEMORIAL_ACCOUNT_CREATION,
              verified: true
            },
            description: 'Social media memorial signal'
          },
          {
            action: 'createThirdPartySignal',
            parameters: {
              source: 'news-outlet',
              signalType: ThirdPartySignalType.OBITUARY_PUBLISHED,
              verified: true
            },
            delay: 500,
            description: 'Obituary publication signal'
          },
          {
            action: 'submitLegalDocument',
            parameters: {
              type: LegalDocumentType.DEATH_CERTIFICATE,
              jurisdiction: 'CA',
              pending: true
            },
            delay: 500,
            description: 'Pending death certificate'
          },
          {
            action: 'evaluateTriggers',
            parameters: {},
            delay: 1000,
            description: 'Evaluate all triggers'
          }
        ],
        expectedResults: [
          {
            field: 'triggered',
            operator: 'equals',
            value: true,
            description: 'Should trigger with corroborating signals'
          },
          {
            field: 'confidence',
            operator: 'greater_than',
            value: 0.7,
            description: 'High confidence with multiple signals'
          }
        ],
        tags: ['complex', 'multi-trigger', 'third-party'],
        createdAt: new Date()
      }
    ]

    // Store scenarios
    scenarios.forEach(scenario => {
      this.testScenarios.set(scenario.id, scenario)
    })

    // Create default test suite
    this.testSuites.set('default', {
      id: 'default',
      name: 'Default Test Suite',
      description: 'Comprehensive test suite for all trigger types',
      scenarios: scenarios.map(s => s.id),
      notifications: {
        onFailure: true,
        onSuccess: false,
        recipients: ['admin']
      }
    })
  }

  /**
   * Run a test scenario
   */
  async runScenario(scenarioId: string, userId: string = 'test-user'): Promise<TestResult> {
    const scenario = this.testScenarios.get(scenarioId)
    if (!scenario) {
      throw new Error(`Test scenario ${scenarioId} not found`)
    }

    if (this.runningTests.has(scenarioId)) {
      throw new Error(`Test scenario ${scenarioId} is already running`)
    }

    this.runningTests.add(scenarioId)
    const startTime = Date.now()
    const logs: string[] = []
    const stepResults: StepResult[] = []

    const result: TestResult = {
      scenarioId,
      success: false,
      executedAt: new Date(),
      duration: 0,
      steps: stepResults,
      assertions: [],
      logs
    }

    try {
      logs.push(`Starting test scenario: ${scenario.name}`)
      
      // Set up test environment
      await this.setupTestEnvironment(userId, scenario)
      
      // Execute each step
      for (const step of scenario.steps) {
        const stepStart = Date.now()
        logs.push(`Executing step: ${step.description || step.action}`)
        
        try {
          // Add delay if specified
          if (step.delay) {
            await new Promise(resolve => setTimeout(resolve, step.delay))
          }
          
          // Execute the step
          const output = await this.executeStep(step, userId)
          
          stepResults.push({
            step,
            success: true,
            executionTime: Date.now() - stepStart,
            output
          })
          
          logs.push(`Step completed successfully`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          stepResults.push({
            step,
            success: false,
            error: errorMessage,
            executionTime: Date.now() - stepStart
          })
          
          logs.push(`Step failed: ${errorMessage}`)
          throw error
        }
      }
      
      // Wait for evaluation to complete
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Verify expected results
      logs.push('Verifying expected results...')
      const assertions = await this.verifyResults(scenario, userId)
      result.assertions = assertions
      
      // Check if all assertions passed
      const allPassed = assertions.every(a => a.passed)
      result.success = allPassed
      
      if (allPassed) {
        logs.push('All assertions passed ✓')
      } else {
        const failed = assertions.filter(a => !a.passed)
        logs.push(`${failed.length} assertions failed:`)
        failed.forEach(a => logs.push(`  - ${a.message}`))
      }
      
    } catch (error) {
      result.success = false
      result.error = error instanceof Error ? error.message : 'Unknown error'
      logs.push(`Test failed: ${result.error}`)
    } finally {
      // Clean up test environment
      await this.cleanupTestEnvironment(userId, scenario)
      
      result.duration = Date.now() - startTime
      logs.push(`Test completed in ${result.duration}ms`)
      
      // Store result
      const results = this.testResults.get(scenarioId) || []
      results.push(result)
      this.testResults.set(scenarioId, results)
      
      // Update scenario
      scenario.lastRunAt = new Date()
      scenario.lastResult = result
      
      this.runningTests.delete(scenarioId)
      
      // Log test execution
      await auditLoggingService.logSystemEvent(
        'trigger_test_executed',
        result.success ? 'success' : 'failure',
        {
          scenarioId,
          scenarioName: scenario.name,
          duration: result.duration,
          success: result.success,
          failedAssertions: result.assertions.filter(a => !a.passed).length
        }
      )
    }
    
    return result
  }

  /**
   * Execute a test step
   */
  private async executeStep(step: TestStep, userId: string): Promise<any> {
    switch (step.action) {
      case 'createMedicalDevice':
        return await medicalEmergencyIntegrationService.registerDevice({
          userId,
          deviceType: step.parameters.deviceType,
          deviceModel: 'Test Device',
          serialNumber: `TEST-${Date.now()}`,
          isActive: true,
          emergencyContacts: ['test-contact'],
          alertThresholds: step.parameters.thresholds
        })
        
      case 'simulateMedicalEmergency':
        return await medicalEmergencyIntegrationService.simulateEmergency(
          userId,
          step.parameters.type,
          step.parameters.severity,
          step.parameters.vitals
        )
        
      case 'submitLegalDocument':
        return await legalDocumentDetectionService.submitDocument({
          userId,
          type: step.parameters.type,
          jurisdiction: step.parameters.jurisdiction,
          caseNumber: step.parameters.caseNumber,
          filingDate: new Date(),
          verificationStatus: step.parameters.pending ? 'pending' : 'unverified',
          metadata: {}
        })
        
      case 'verifyDocument':
        const documents = await legalDocumentDetectionService.getDocumentsByType(
          userId,
          step.parameters.documentType
        )
        if (documents.length > 0 && step.parameters.autoApprove) {
          const doc = documents[0]
          doc.verificationStatus = 'verified'
          doc.verifiedAt = new Date()
          return doc
        }
        break
        
      case 'createBeneficiary':
        // Simulate beneficiary creation
        return {
          id: `beneficiary-${step.parameters.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: step.parameters.name,
          relationship: step.parameters.relationship
        }
        
      case 'submitPetition':
        return await beneficiaryPetitionService.submitPetition({
          userId,
          petitionerId: step.parameters.petitionerId,
          type: step.parameters.type,
          urgency: step.parameters.urgency,
          reason: step.parameters.reason,
          supportingEvidence: [],
          contactInfo: {
            email: 'test@example.com',
            phone: '+1234567890'
          }
        })
        
      case 'enableDeadManSwitch':
        return await deadManSwitchService.createSwitch(userId, {
          checkInIntervalDays: step.parameters.checkInIntervalDays,
          gracePeriodDays: step.parameters.gracePeriodDays,
          alertContacts: ['test-contact'],
          escalationActions: []
        })
        
      case 'simulateInactivity':
        const switchStatus = await deadManSwitchService.getSwitchStatus(userId)
        if (switchStatus) {
          // Simulate past check-in
          const daysAgo = step.parameters.daysInactive
          switchStatus.lastCheckinAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
          return switchStatus
        }
        break
        
      case 'createManualOverride':
        return await manualOverrideService.createOverride({
          userId,
          type: step.parameters.type,
          priority: step.parameters.priority,
          reason: step.parameters.reason,
          authenticationMethod: step.parameters.authMethod,
          requiresApproval: false,
          metadata: {}
        })
        
      case 'authenticateOverride':
        // Simulate authentication
        return {
          authenticated: true,
          method: step.parameters.method,
          timestamp: new Date()
        }
        
      case 'createThirdPartySignal':
        return await thirdPartyIntegrationService.processSignal({
          userId,
          sourceId: step.parameters.source,
          sourceName: step.parameters.source,
          signalType: step.parameters.signalType,
          signalData: {},
          verified: step.parameters.verified,
          receivedAt: new Date()
        })
        
      case 'evaluateTriggers':
        return await triggerEvaluationEngine.triggerEvaluation(userId)
        
      default:
        throw new Error(`Unknown test action: ${step.action}`)
    }
  }

  /**
   * Set up test environment
   */
  private async setupTestEnvironment(userId: string, scenario: TestScenario): Promise<void> {
    // Create test triggers
    await triggerConditionsService.createTrigger({
      userId,
      type: scenario.triggerType,
      name: `Test: ${scenario.name}`,
      description: scenario.description,
      conditions: {
        threshold: 1,
        timeWindow: 60,
        requiredConfidence: 0.5,
        cooldownPeriod: 0,
        allowManualTrigger: true,
        notifyOnTrigger: false,
        emailOnTrigger: false
      },
      actions: ['GRANT_ACCESS', 'NOTIFY_CONTACTS'],
      priority: TriggerPriority.HIGH,
      status: TriggerStatus.ACTIVE,
      metadata: {
        isTest: true,
        scenarioId: scenario.id
      }
    })
    
    // Register user for evaluation
    await triggerEvaluationEngine.registerUser(userId, {
      frequency: 'realtime',
      enabled: true,
      nextRun: new Date()
    })
  }

  /**
   * Clean up test environment
   */
  private async cleanupTestEnvironment(userId: string, scenario: TestScenario): Promise<void> {
    // Remove test triggers
    const triggers = await triggerConditionsService.getUserTriggers(userId)
    for (const trigger of triggers) {
      if (trigger.metadata?.isTest && trigger.metadata?.scenarioId === scenario.id) {
        await triggerConditionsService.deleteTrigger(trigger.id)
      }
    }
    
    // Clean up test data based on scenario type
    switch (scenario.triggerType) {
      case TriggerType.MEDICAL_EMERGENCY:
        // Clean up test devices and emergencies
        const devices = await medicalEmergencyIntegrationService.getUserDevices(userId)
        for (const device of devices) {
          if (device.serialNumber?.startsWith('TEST-')) {
            await medicalEmergencyIntegrationService.removeDevice(device.id)
          }
        }
        break
        
      case TriggerType.LEGAL_DOCUMENT_FILED:
        // Clean up test documents
        const documents = await legalDocumentDetectionService.getUserDocuments(userId)
        for (const doc of documents) {
          if (doc.caseNumber?.startsWith('TEST-')) {
            await legalDocumentDetectionService.deleteDocument(doc.id)
          }
        }
        break
        
      case TriggerType.BENEFICIARY_PETITION:
        // Clean up test petitions
        const petitions = await beneficiaryPetitionService.getUserPetitions(userId)
        for (const petition of petitions) {
          if (petition.reason?.includes('test') || petition.reason?.includes('Test')) {
            await beneficiaryPetitionService.cancelPetition(petition.id, 'Test cleanup')
          }
        }
        break
    }
  }

  /**
   * Verify test results
   */
  private async verifyResults(
    scenario: TestScenario,
    userId: string
  ): Promise<AssertionResult[]> {
    const assertions: AssertionResult[] = []
    
    // Get latest evaluation results
    const evaluationHistory = triggerEvaluationEngine.getEvaluationHistory(userId)
    const latestResults = evaluationHistory.filter(r => 
      r.timestamp > new Date(Date.now() - 5000) // Last 5 seconds
    )
    
    if (latestResults.length === 0) {
      assertions.push({
        expected: { field: 'evaluation', operator: 'exists', value: true },
        actual: null,
        passed: false,
        message: 'No evaluation results found'
      })
      return assertions
    }
    
    // Find relevant result for this trigger type
    const relevantResult = latestResults.find(r => {
      const trigger = this.getTriggerFromResult(r)
      return trigger?.type === scenario.triggerType
    })
    
    if (!relevantResult) {
      assertions.push({
        expected: { field: 'trigger', operator: 'exists', value: scenario.triggerType },
        actual: null,
        passed: false,
        message: `No evaluation result found for trigger type ${scenario.triggerType}`
      })
      return assertions
    }
    
    // Verify each expected result
    for (const expected of scenario.expectedResults) {
      const actual = this.getFieldValue(expected.field, relevantResult)
      const passed = this.assertValue(actual, expected.operator, expected.value)
      
      assertions.push({
        expected,
        actual,
        passed,
        message: passed 
          ? `✓ ${expected.description || expected.field}`
          : `✗ ${expected.description || expected.field}: expected ${expected.field} ${expected.operator} ${expected.value}, got ${actual}`
      })
    }
    
    return assertions
  }

  /**
   * Get trigger from evaluation result
   */
  private getTriggerFromResult(result: any): TriggerCondition | null {
    // This would normally look up the trigger by ID
    // For testing, we'll use metadata
    return {
      id: result.triggerId,
      type: result.metadata?.type || TriggerType.MANUAL_OVERRIDE,
      userId: 'test-user',
      name: 'Test Trigger',
      description: '',
      conditions: {},
      actions: result.requiredActions || [],
      priority: TriggerPriority.HIGH,
      status: TriggerStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date()
    } as TriggerCondition
  }

  /**
   * Get field value from object
   */
  private getFieldValue(field: string, obj: any): any {
    const parts = field.split('.')
    let value = obj
    
    for (const part of parts) {
      value = value?.[part]
    }
    
    return value
  }

  /**
   * Assert value matches expected
   */
  private assertValue(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'contains':
        if (Array.isArray(actual)) {
          return actual.includes(expected)
        }
        return String(actual).includes(String(expected))
      case 'greater_than':
        return Number(actual) > Number(expected)
      case 'less_than':
        return Number(actual) < Number(expected)
      case 'exists':
        return actual !== null && actual !== undefined
      default:
        return false
    }
  }

  /**
   * Public API
   */

  /**
   * Get all test scenarios
   */
  getScenarios(): TestScenario[] {
    return Array.from(this.testScenarios.values())
  }

  /**
   * Get test scenario by ID
   */
  getScenario(id: string): TestScenario | undefined {
    return this.testScenarios.get(id)
  }

  /**
   * Create custom test scenario
   */
  createScenario(scenario: Omit<TestScenario, 'id' | 'createdAt'>): TestScenario {
    const newScenario: TestScenario = {
      ...scenario,
      id: `custom-${Date.now()}`,
      createdAt: new Date()
    }
    
    this.testScenarios.set(newScenario.id, newScenario)
    return newScenario
  }

  /**
   * Run test suite
   */
  async runSuite(suiteId: string, userId: string = 'test-user'): Promise<Map<string, TestResult>> {
    const suite = this.testSuites.get(suiteId)
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`)
    }
    
    const results = new Map<string, TestResult>()
    
    for (const scenarioId of suite.scenarios) {
      try {
        const result = await this.runScenario(scenarioId, userId)
        results.set(scenarioId, result)
      } catch (error) {
        console.error(`Failed to run scenario ${scenarioId}:`, error)
      }
    }
    
    // Send notifications if configured
    if (suite.notifications.onFailure || suite.notifications.onSuccess) {
      const failed = Array.from(results.values()).filter(r => !r.success)
      const shouldNotify = (failed.length > 0 && suite.notifications.onFailure) ||
                          (failed.length === 0 && suite.notifications.onSuccess)
      
      if (shouldNotify) {
        // Send notification (implementation would depend on notification service)
        console.log(`Test suite ${suite.name} completed: ${results.size - failed.length}/${results.size} passed`)
      }
    }
    
    return results
  }

  /**
   * Get test results
   */
  getResults(scenarioId?: string): TestResult[] {
    if (scenarioId) {
      return this.testResults.get(scenarioId) || []
    }
    
    // Return all results
    const allResults: TestResult[] = []
    for (const results of this.testResults.values()) {
      allResults.push(...results)
    }
    return allResults
  }

  /**
   * Clear test results
   */
  clearResults(scenarioId?: string): void {
    if (scenarioId) {
      this.testResults.delete(scenarioId)
    } else {
      this.testResults.clear()
    }
  }

  /**
   * Export test results
   */
  exportResults(format: 'json' | 'csv' = 'json'): string {
    const allResults = this.getResults()
    
    if (format === 'json') {
      return JSON.stringify(allResults, null, 2)
    }
    
    // CSV format
    const headers = ['Scenario ID', 'Scenario Name', 'Success', 'Duration (ms)', 'Executed At', 'Failed Assertions']
    const rows = allResults.map(r => {
      const scenario = this.testScenarios.get(r.scenarioId)
      return [
        r.scenarioId,
        scenario?.name || 'Unknown',
        r.success ? 'PASS' : 'FAIL',
        r.duration,
        r.executedAt.toISOString(),
        r.assertions.filter(a => !a.passed).length
      ]
    })
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }
}

// Create singleton instance
export const triggerTestingService = new TriggerTestingService()