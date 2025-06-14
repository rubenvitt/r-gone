import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService } from '@/services/legal-integration-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const body = await request.json()
    
    const { name, email, signatureData } = body

    if (!name || !email || !signatureData) {
      return NextResponse.json(
        { error: 'Name, email, and signature data are required' },
        { status: 400 }
      )
    }

    const signature = await legalIntegrationService.addDigitalSignature(
      params.documentId,
      session.userId,
      { name, email, signatureData },
      request
    )

    return NextResponse.json({
      success: true,
      signature
    })
  } catch (error) {
    console.error('Error adding signature:', error)
    return NextResponse.json(
      { error: 'Failed to add signature' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { signatureId, verificationCode } = body

    if (!signatureId || !verificationCode) {
      return NextResponse.json(
        { error: 'Signature ID and verification code are required' },
        { status: 400 }
      )
    }

    const isValid = await legalIntegrationService.verifySignature(
      params.documentId,
      signatureId,
      verificationCode
    )

    return NextResponse.json({
      success: true,
      valid: isValid
    })
  } catch (error) {
    console.error('Error verifying signature:', error)
    return NextResponse.json(
      { error: 'Failed to verify signature' },
      { status: 500 }
    )
  }
}