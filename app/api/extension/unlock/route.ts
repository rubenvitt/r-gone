import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { masterPassword } = await request.json()
    
    if (!masterPassword) {
      return NextResponse.json(
        { error: 'Master password required' },
        { status: 400 }
      )
    }
    
    // In production, validate against stored password hash
    // For now, accept any password for testing
    const isValid = masterPassword.length >= 8
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid master password' },
        { status: 401 }
      )
    }
    
    // Generate auth token and vault key
    const token = createHash('sha256')
      .update(`${masterPassword}-${Date.now()}`)
      .digest('hex')
    
    const vaultKey = createHash('sha256')
      .update(masterPassword)
      .digest('hex')
    
    return NextResponse.json({
      success: true,
      token,
      vaultKey
    })
  } catch (error) {
    console.error('Unlock error:', error)
    return NextResponse.json(
      { error: 'Failed to unlock vault' },
      { status: 500 }
    )
  }
}