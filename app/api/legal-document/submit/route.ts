import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalDocumentDetectionService, LegalDocumentType, DocumentVerificationStatus, LegalAuthorityLevel } from '@/services/legal-document-detection-service'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const userId = 'current-user' // In production, extract from session

    // Validate required fields
    const { 
      documentType, 
      documentNumber, 
      issuingAuthority, 
      jurisdiction,
      filingDate,
      courtName,
      caseNumber,
      attachments,
      relatedPersons
    } = data

    if (!documentType || !documentNumber || !issuingAuthority || !jurisdiction) {
      return NextResponse.json(
        { error: 'Document type, number, issuing authority, and jurisdiction are required' },
        { status: 400 }
      )
    }

    // Create legal document filing
    const filing = {
      userId,
      documentType: documentType as LegalDocumentType,
      documentNumber,
      filingDate: filingDate ? new Date(filingDate) : new Date(),
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      issuingAuthority,
      jurisdiction,
      courtName,
      caseNumber,
      verificationStatus: DocumentVerificationStatus.PENDING,
      authorityLevel: data.authorityLevel || LegalAuthorityLevel.NONE,
      grantedPermissions: data.grantedPermissions || [],
      documentHash: data.documentHash,
      submittedBy: userId,
      attachments: attachments || [],
      relatedPersons: relatedPersons || []
    }

    const documentId = await legalDocumentDetectionService.submitLegalDocument(filing)

    return NextResponse.json({
      success: true,
      documentId,
      message: 'Legal document submitted for verification',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error submitting legal document:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit legal document' },
      { status: 500 }
    )
  }
}