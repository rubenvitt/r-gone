import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/services/auth-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { passphrase, recoveryHint } = body

    if (!passphrase || typeof passphrase !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Passphrase is required' },
        { status: 400 }
      )
    }

    // Generate userId from passphrase
    const userId = authService.generateUserIdFromPassphrase(passphrase)
    const result = await authService.setPassphrase(passphrase, userId, recoveryHint)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Passphrase set successfully'
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to setup passphrase' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // This endpoint now requires authentication to check setup status
    // For unauthenticated users, we'll return that no passphrase is set
    // This is secure because each user has their own account
    const sessionId = request.cookies.get('session')?.value
    
    if (!sessionId) {
      return NextResponse.json({
        success: true,
        hasPassphrase: false,
        recoveryHint: null
      })
    }

    const { valid, userId } = await authService.validateSession(sessionId)
    if (!valid || !userId) {
      return NextResponse.json({
        success: true,
        hasPassphrase: false,
        recoveryHint: null
      })
    }

    const hasPassphrase = await authService.hasPassphrase(userId)
    const recoveryHint = hasPassphrase ? await authService.getRecoveryHint(userId) : null

    return NextResponse.json({
      success: true,
      hasPassphrase,
      recoveryHint
    })
  } catch (error) {
    console.error('Setup check error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check setup status' },
      { status: 500 }
    )
  }
}