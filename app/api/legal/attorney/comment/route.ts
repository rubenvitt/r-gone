import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService } from '@/services/legal-integration-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const body = await request.json()
    
    const {
      collaborationId,
      content,
      section,
      lineNumber,
      type,
      priority,
      resolved
    } = body

    if (!collaborationId || !content) {
      return NextResponse.json(
        { error: 'Collaboration ID and content are required' },
        { status: 400 }
      )
    }

    const comment = await legalIntegrationService.addAttorneyComment(
      collaborationId,
      {
        authorId: session.userId,
        authorName: session.name || 'User',
        content,
        section,
        lineNumber,
        type: type || 'comment',
        priority: priority || 'medium',
        resolved: resolved || false
      }
    )

    return NextResponse.json({
      success: true,
      comment
    })
  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    )
  }
}