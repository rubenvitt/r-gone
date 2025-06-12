import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { passphrase } = body

    if (!passphrase || typeof passphrase !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Passphrase is required' },
        { status: 400 }
      )
    }

    // Get client info
    const clientInfo = {
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    const result = await authService.authenticate(passphrase, 'default', clientInfo)

    if (!result.success) {
      const status = result.lockedUntil ? 429 : 401
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          remainingAttempts: result.remainingAttempts,
          lockedUntil: result.lockedUntil
        },
        { status }
      )
    }

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful'
    })

    response.cookies.set('session', result.sessionId!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 // 24 hours
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}