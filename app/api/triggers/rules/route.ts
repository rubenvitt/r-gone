import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { triggerEvaluationEngine, EvaluationRule } from '@/services/trigger-evaluation-engine'
import { auditLoggingService } from '@/services/audit-logging-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, return default rules structure
    // In a real implementation, this would fetch user-specific rules
    const defaultRules: EvaluationRule[] = [
      {
        id: 'medical-emergency-critical',
        name: 'Critical Medical Emergency',
        description: 'Immediate access for critical medical emergencies',
        conditions: [{
          type: 'any',
          conditions: [
            { field: 'type', operator: 'equals', value: 'medical_emergency' },
            { field: 'metadata.severity', operator: 'equals', value: 'critical' }
          ]
        }],
        actions: [
          { type: 'grant_access', parameters: { level: 'full', duration: 24 } },
          { type: 'notify', target: 'emergency_contacts', parameters: { priority: 'urgent' } }
        ],
        priority: 100,
        enabled: true
      }
    ]

    return NextResponse.json({
      success: true,
      rules: defaultRules
    })
  } catch (error) {
    console.error('Error fetching evaluation rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evaluation rules' },
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
    const { userId, rules } = body

    if (!Array.isArray(rules)) {
      return NextResponse.json(
        { error: 'Rules must be an array' },
        { status: 400 }
      )
    }

    // Validate rules structure
    for (const rule of rules) {
      if (!rule.id || !rule.name || !rule.conditions || !rule.actions) {
        return NextResponse.json(
          { error: 'Invalid rule structure' },
          { status: 400 }
        )
      }
    }

    // Update user rules
    triggerEvaluationEngine.updateUserRules(userId || 'default-user', rules)

    // Log the update
    await auditLoggingService.logSystemEvent(
      'trigger_rules_updated',
      'success',
      {
        userId: userId || 'default-user',
        ruleCount: rules.length,
        ruleIds: rules.map(r => r.id)
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Evaluation rules updated successfully',
      ruleCount: rules.length
    })
  } catch (error) {
    console.error('Error updating evaluation rules:', error)
    
    await auditLoggingService.logError(
      'rules_update_failed',
      'Failed to update evaluation rules',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
    
    return NextResponse.json(
      { error: 'Failed to update evaluation rules' },
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
    const { userId, ruleId, enabled } = body

    if (!ruleId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Rule ID and enabled status are required' },
        { status: 400 }
      )
    }

    // In a real implementation, this would update a specific rule's enabled status
    // For now, we'll just log the action
    await auditLoggingService.logSystemEvent(
      'trigger_rule_toggled',
      'success',
      {
        userId: userId || 'default-user',
        ruleId,
        enabled
      }
    )

    return NextResponse.json({
      success: true,
      message: `Rule ${enabled ? 'enabled' : 'disabled'} successfully`,
      ruleId,
      enabled
    })
  } catch (error) {
    console.error('Error toggling rule:', error)
    return NextResponse.json(
      { error: 'Failed to toggle rule' },
      { status: 500 }
    )
  }
}