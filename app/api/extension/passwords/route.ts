import { NextRequest, NextResponse } from 'next/server'

// Mock password data for testing
const mockPasswords = [
  {
    id: '1',
    name: 'GitHub',
    url: 'https://github.com',
    username: 'user@example.com',
    category: 'development',
    lastUsed: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Google',
    url: 'https://accounts.google.com',
    username: 'user@gmail.com',
    category: 'personal',
    lastUsed: new Date().toISOString()
  }
]

export async function GET(request: NextRequest) {
  try {
    // Validate auth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Return password list (without actual passwords)
    return NextResponse.json({
      success: true,
      passwords: mockPasswords
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch passwords' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate auth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const passwordData = await request.json()
    
    // Validate required fields
    if (!passwordData.name || !passwordData.url || !passwordData.username || !passwordData.password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // In production, encrypt and save the password
    const newPassword = {
      id: Date.now().toString(),
      ...passwordData,
      password: undefined, // Don't return the password
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      id: newPassword.id
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save password' },
      { status: 500 }
    )
  }
}