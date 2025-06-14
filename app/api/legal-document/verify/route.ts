import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalDocumentDetectionService, DocumentVerificationStatus } from '@/services/legal-document-detection-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { documentId, status, verifiedBy, rejectionReason } = data

    if (!documentId || !status) {
      return NextResponse.json(
        { error: 'Document ID and verification status are required' },
        { status: 400 }
      )
    }

    // Validate status
    if (!Object.values(DocumentVerificationStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid verification status' },
        { status: 400 }
      )
    }

    await legalDocumentDetectionService.updateDocumentVerification(
      documentId,
      status as DocumentVerificationStatus,
      verifiedBy,
      rejectionReason
    )

    return NextResponse.json({
      success: true,
      message: 'Document verification status updated',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating document verification:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update verification status' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending verifications (admin functionality)
    const pendingVerifications = legalDocumentDetectionService.getPendingVerifications()

    return NextResponse.json({
      pendingVerifications,
      count: pendingVerifications.length
    })
  } catch (error) {
    console.error('Error fetching pending verifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending verifications' },
      { status: 500 }
    )
  }
}