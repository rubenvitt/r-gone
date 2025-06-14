import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService } from '@/services/legal-integration-service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workflowId: string, stepId: string } }
) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const body = await request.json()

    await legalIntegrationService.updateWorkflowStep(
      params.workflowId,
      params.stepId,
      {
        ...body,
        completedBy: body.completedBy || session.userId
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Workflow step updated successfully'
    })
  } catch (error) {
    console.error('Error updating workflow step:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow step' },
      { status: 500 }
    )
  }
}