import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth-service'
import { logAuth } from '@/utils/audit-utils'

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value

    if (!sessionId) {
      await logAuth('failure', request, undefined, { 
        reason: 'no_session',
        sessionId 
      })
      
      return NextResponse.json(
        { success: false, error: 'No session found', authenticated: false },
        { status: 401 }
      )
    }

    const result = await authService.validateSession(sessionId)

    if (!result.valid) {
      await logAuth('failure', request, result.userId, { 
        reason: 'invalid_session',
        sessionId,
        error: result.error 
      })
      
      const response = NextResponse.json(
        { success: false, error: result.error, authenticated: false },
        { status: 401 }
      )
      
      // Clear invalid session cookie
      response.cookies.delete('session')
      return response
    }

    await logAuth('success', request, result.userId, { 
      sessionId,
      action: 'session_validation'
    })

    return NextResponse.json({
      success: true,
      authenticated: true,
      userId: result.userId
    })
  } catch (error) {
    await logAuth('error', request, undefined, { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    console.error('Session validation error:', error)
    return NextResponse.json(
      { success: false, error: 'Session validation failed', authenticated: false },
      { status: 500 }
    )
  }
}