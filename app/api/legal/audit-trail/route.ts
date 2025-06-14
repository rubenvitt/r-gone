import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService } from '@/services/legal-integration-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    const auditTrail = await legalIntegrationService.generateCourtAuditTrail(documentId)

    return NextResponse.json({
      success: true,
      auditTrail
    })
  } catch (error) {
    console.error('Error generating audit trail:', error)
    return NextResponse.json(
      { error: 'Failed to generate audit trail' },
      { status: 500 }
    )
  }
}