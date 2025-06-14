import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerTestingService } from '@/services/trigger-testing-service'
import { auditLoggingService } from '@/services/audit-logging-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const scenarioId = searchParams.get('id')
    
    if (scenarioId) {
      // Get specific scenario
      const scenario = triggerTestingService.getScenario(scenarioId)
      if (!scenario) {
        return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
      }
      
      // Include recent results
      const results = triggerTestingService.getResults(scenarioId)
      
      return NextResponse.json({
        success: true,
        scenario,
        results: results.slice(-10) // Last 10 results
      })
    }

    // Get all scenarios
    const scenarios = triggerTestingService.getScenarios()
    
    return NextResponse.json({
      success: true,
      scenarios,
      count: scenarios.length
    })
  } catch (error) {
    console.error('Error fetching test scenarios:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test scenarios' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, triggerType, steps, expectedResults, tags } = body

    if (!name || !triggerType || !steps || !expectedResults) {
      return NextResponse.json(
        { error: 'Name, trigger type, steps, and expected results are required' },
        { status: 400 }
      )
    }

    // Create new scenario
    const scenario = triggerTestingService.createScenario({
      name,
      description: description || '',
      triggerType,
      steps,
      expectedResults,
      tags: tags || []
    })

    // Log creation
    await auditLoggingService.logSystemEvent(
      'test_scenario_created',
      'success',
      {
        scenarioId: scenario.id,
        name: scenario.name,
        triggerType: scenario.triggerType
      }
    )

    return NextResponse.json({
      success: true,
      scenario,
      message: 'Test scenario created successfully'
    })
  } catch (error) {
    console.error('Error creating test scenario:', error)
    
    await auditLoggingService.logError(
      'test_scenario_creation_failed',
      'Failed to create test scenario',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
    
    return NextResponse.json(
      { error: 'Failed to create test scenario' },
      { status: 500 }
    )
  }
}