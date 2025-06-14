import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerTestingService } from '@/services/trigger-testing-service'
import { auditLoggingService } from '@/services/audit-logging-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { scenarioId, suiteId, userId = 'test-user' } = body

    if (!scenarioId && !suiteId) {
      return NextResponse.json(
        { error: 'Either scenario ID or suite ID is required' },
        { status: 400 }
      )
    }

    // Log test start
    await auditLoggingService.logSystemEvent(
      'trigger_test_started',
      'pending',
      {
        scenarioId,
        suiteId,
        userId
      }
    )

    if (suiteId) {
      // Run test suite
      try {
        const results = await triggerTestingService.runSuite(suiteId, userId)
        
        const summary = {
          total: results.size,
          passed: Array.from(results.values()).filter(r => r.success).length,
          failed: Array.from(results.values()).filter(r => !r.success).length
        }

        await auditLoggingService.logSystemEvent(
          'test_suite_completed',
          summary.failed === 0 ? 'success' : 'failure',
          {
            suiteId,
            ...summary
          }
        )

        return NextResponse.json({
          success: true,
          suiteId,
          results: Object.fromEntries(results),
          summary
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        await auditLoggingService.logError(
          'test_suite_failed',
          `Test suite ${suiteId} failed`,
          { suiteId, error: errorMessage }
        )
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        )
      }
    } else {
      // Run single scenario
      try {
        const result = await triggerTestingService.runScenario(scenarioId, userId)
        
        return NextResponse.json({
          success: true,
          scenarioId,
          result,
          summary: {
            duration: result.duration,
            passed: result.success,
            failedAssertions: result.assertions.filter(a => !a.passed).length,
            totalAssertions: result.assertions.length
          }
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        await auditLoggingService.logError(
          'test_scenario_failed',
          `Test scenario ${scenarioId} failed`,
          { scenarioId, error: errorMessage }
        )
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error('Error running trigger test:', error)
    return NextResponse.json(
      { error: 'Failed to run trigger test' },
      { status: 500 }
    )
  }
}