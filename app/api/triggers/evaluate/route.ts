import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerEvaluationEngine } from '@/services/trigger-evaluation-engine'
import { auditLoggingService } from '@/services/audit-logging-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, immediate = false } = body

    // Log the evaluation request
    await auditLoggingService.logTriggerEvaluation(
      userId || 'system',
      'manual_evaluation_requested',
      'pending',
      { immediate }
    )

    // Trigger evaluation
    const results = await triggerEvaluationEngine.triggerEvaluation(
      userId || 'default-user'
    )

    // Log the results
    await auditLoggingService.logTriggerEvaluation(
      userId || 'system',
      'manual_evaluation_completed',
      'success',
      {
        totalTriggers: results.length,
        triggered: results.filter(r => r.triggered).length,
        results: results.map(r => ({
          triggerId: r.triggerId,
          triggered: r.triggered,
          confidence: r.confidence
        }))
      }
    )

    return NextResponse.json({
      success: true,
      results,
      summary: {
        evaluated: results.length,
        triggered: results.filter(r => r.triggered).length,
        highConfidence: results.filter(r => r.confidence >= 0.8).length
      }
    })
  } catch (error) {
    console.error('Error evaluating triggers:', error)
    
    await auditLoggingService.logError(
      'trigger_evaluation_failed',
      'Failed to evaluate triggers',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
    
    return NextResponse.json(
      { error: 'Failed to evaluate triggers' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || 'default-user'

    // Get evaluation history
    const history = triggerEvaluationEngine.getEvaluationHistory(userId)
    
    // Get user schedule
    const schedule = triggerEvaluationEngine.getUserSchedule(userId)

    return NextResponse.json({
      success: true,
      history: history.slice(-50), // Last 50 evaluations
      schedule,
      stats: {
        totalEvaluations: history.length,
        recentTriggers: history.filter(h => 
          h.triggered && 
          h.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length
      }
    })
  } catch (error) {
    console.error('Error fetching evaluation history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evaluation history' },
      { status: 500 }
    )
  }
}