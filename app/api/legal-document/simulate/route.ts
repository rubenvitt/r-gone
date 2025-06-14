import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalDocumentDetectionService, LegalDocumentType } from '@/services/legal-document-detection-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const userId = 'current-user' // In production, extract from session
    const { documentType, customData } = data

    if (!documentType) {
      return NextResponse.json(
        { error: 'Document type is required' },
        { status: 400 }
      )
    }

    // Validate document type
    if (!Object.values(LegalDocumentType).includes(documentType)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      )
    }

    // Simulate the legal document filing
    const documentId = await legalDocumentDetectionService.simulateDocumentFiling(
      userId,
      documentType as LegalDocumentType,
      customData
    )

    return NextResponse.json({
      success: true,
      documentId,
      message: `Simulated ${documentType} filing`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error simulating legal document filing:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to simulate document filing' },
      { status: 500 }
    )
  }
}