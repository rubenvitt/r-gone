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

    const result = await authService.setPassphrase(passphrase, 'default', recoveryHint)

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

export async function GET() {
  try {
    const hasPassphrase = await authService.hasPassphrase('default')
    const recoveryHint = hasPassphrase ? await authService.getRecoveryHint('default') : null

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