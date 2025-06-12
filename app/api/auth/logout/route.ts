import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth-service'

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value

    if (sessionId) {
      await authService.destroySession(sessionId)
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear session cookie
    response.cookies.delete('session')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}