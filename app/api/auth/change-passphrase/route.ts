import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth-service'

export async function POST(request: NextRequest) {
  try {
    // Validate session first
    const sessionId = request.cookies.get('session')?.value
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const sessionResult = await authService.validateSession(sessionId)
    if (!sessionResult.valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { currentPassphrase, newPassphrase } = body

    if (!currentPassphrase || typeof currentPassphrase !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Current passphrase is required' },
        { status: 400 }
      )
    }

    if (!newPassphrase || typeof newPassphrase !== 'string') {
      return NextResponse.json(
        { success: false, error: 'New passphrase is required' },
        { status: 400 }
      )
    }

    const result = await authService.changePassphrase(
      currentPassphrase,
      newPassphrase,
      sessionResult.userId || 'default'
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Passphrase changed successfully'
    })
  } catch (error) {
    console.error('Change passphrase error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to change passphrase' },
      { status: 500 }
    )
  }
}