import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService, WorkflowType } from '@/services/legal-integration-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const body = await request.json()
    
    const { type, ...data } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Workflow type is required' },
        { status: 400 }
      )
    }

    const workflow = await legalIntegrationService.createWorkflow(
      session.userId,
      type as WorkflowType,
      data
    )

    return NextResponse.json({
      success: true,
      workflow
    })
  } catch (error) {
    console.error('Error creating workflow:', error)
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    )
  }
}