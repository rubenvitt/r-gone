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

    const body = await request.json()
    
    const { name, relationship, email, phone, address, signature } = body

    if (!name || !relationship) {
      return NextResponse.json(
        { error: 'Witness name and relationship are required' },
        { status: 400 }
      )
    }

    const witness = await legalIntegrationService.addWitness(
      params.documentId,
      {
        name,
        email,
        phone,
        address,
        relationship,
        signature,
        signedAt: signature ? new Date() : undefined,
        verificationMethod: 'digital'
      }
    )

    return NextResponse.json({
      success: true,
      witness
    })
  } catch (error) {
    console.error('Error adding witness:', error)
    return NextResponse.json(
      { error: 'Failed to add witness' },
      { status: 500 }
    )
  }
}