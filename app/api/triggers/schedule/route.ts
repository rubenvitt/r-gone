import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerEvaluationEngine } from '@/services/trigger-evaluation-engine'
import { auditLoggingService } from '@/services/audit-logging-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || 'default-user'

    // Get user schedule
    const schedule = triggerEvaluationEngine.getUserSchedule(userId)

    if (!schedule) {
      return NextResponse.json({
        success: true,
        schedule: null,
        message: 'No evaluation schedule configured'
      })
    }

    return NextResponse.json({
      success: true,
      schedule
    })
  } catch (error) {
    console.error('Error fetching evaluation schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evaluation schedule' },
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
    const { 
      userId, 
      frequency = 'hourly',
      enabled = true
    } = body

    // Validate frequency
    const validFrequencies = ['realtime', 'minute', 'hourly', 'daily', 'weekly']
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be one of: ' + validFrequencies.join(', ') },
        { status: 400 }
      )
    }

    // Register or update user schedule
    await triggerEvaluationEngine.registerUser(userId || 'default-user', {
      frequency,
      enabled,
      nextRun: new Date()
    })

    // Log the schedule update
    await auditLoggingService.logSystemEvent(
      'trigger_schedule_updated',
      'success',
      {
        userId: userId || 'default-user',
        frequency,
        enabled
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Evaluation schedule updated successfully',
      schedule: {
        userId: userId || 'default-user',
        frequency,
        enabled,
        nextRun: new Date()
      }
    })
  } catch (error) {
    console.error('Error updating evaluation schedule:', error)
    
    await auditLoggingService.logError(
      'schedule_update_failed',
      'Failed to update evaluation schedule',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
    
    return NextResponse.json(
      { error: 'Failed to update evaluation schedule' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Enabled must be a boolean value' },
        { status: 400 }
      )
    }

    // Enable/disable evaluation
    triggerEvaluationEngine.setUserEvaluationEnabled(
      userId || 'default-user',
      enabled
    )

    // Log the change
    await auditLoggingService.logSystemEvent(
      'trigger_evaluation_toggled',
      'success',
      {
        userId: userId || 'default-user',
        enabled
      }
    )

    return NextResponse.json({
      success: true,
      message: `Evaluation ${enabled ? 'enabled' : 'disabled'} successfully`,
      enabled
    })
  } catch (error) {
    console.error('Error toggling evaluation:', error)
    return NextResponse.json(
      { error: 'Failed to toggle evaluation' },
      { status: 500 }
    )
  }
}