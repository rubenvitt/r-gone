import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if request has valid auth token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    // For now, just return success
    // In production, validate the token
    return NextResponse.json({ 
      success: true,
      message: 'Extension connected'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Connection check failed' },
      { status: 500 }
    )
  }
}