import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth-service'

export interface AuthContext {
  userId: string
  sessionId: string
}

export async function requireAuth(
  request: NextRequest
): Promise<{ success: true; auth: AuthContext } | { success: false; error: NextResponse }> {
  const sessionId = request.cookies.get('session')?.value

  if (!sessionId) {
    return {
      success: false,
      error: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  const { valid, userId } = await authService.validateSession(sessionId)

  if (!valid || !userId) {
    return {
      success: false,
      error: NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }
  }

  return {
    success: true,
    auth: { userId, sessionId }
  }
}