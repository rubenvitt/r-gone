import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService } from '@/services/legal-integration-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const {
      documentId,
      courtId,
      courtName,
      jurisdiction,
      caseNumber,
      electronicFiling,
      apiEndpoint,
      credentials
    } = body

    if (!documentId || !courtId || !courtName || !jurisdiction) {
      return NextResponse.json(
        { error: 'Document ID, court ID, court name, and jurisdiction are required' },
        { status: 400 }
      )
    }

    const integration = await legalIntegrationService.setupCourtIntegration(
      documentId,
      {
        courtId,
        courtName,
        jurisdiction,
        caseNumber,
        electronicFiling: electronicFiling || false,
        apiEndpoint,
        credentials
      }
    )

    return NextResponse.json({
      success: true,
      integration
    })
  } catch (error) {
    console.error('Error setting up court integration:', error)
    return NextResponse.json(
      { error: 'Failed to set up court integration' },
      { status: 500 }
    )
  }
}