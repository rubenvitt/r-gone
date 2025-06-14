import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService, NotarizationInfo } from '@/services/legal-integration-service'

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
    
    const {
      notaryId,
      notaryName,
      notaryNumber,
      notaryState,
      seal,
      commission,
      location,
      verificationType,
      sessionRecording
    } = body

    if (!notaryId || !notaryName || !notaryNumber || !notaryState || !seal || !commission) {
      return NextResponse.json(
        { error: 'All notary information is required' },
        { status: 400 }
      )
    }

    const notarizationInfo: NotarizationInfo = {
      notaryId,
      notaryName,
      notaryNumber,
      notaryState,
      notarizedAt: new Date(),
      seal,
      commission: {
        number: commission.number,
        expiresAt: new Date(commission.expiresAt)
      },
      location: location || 'Unknown',
      verificationType: verificationType || 'in_person',
      sessionRecording
    }

    await legalIntegrationService.addNotarization(
      params.documentId,
      notarizationInfo
    )

    return NextResponse.json({
      success: true,
      message: 'Document notarized successfully'
    })
  } catch (error) {
    console.error('Error notarizing document:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to notarize document' },
      { status: 500 }
    )
  }
}