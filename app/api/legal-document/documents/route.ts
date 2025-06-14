import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalDocumentDetectionService } from '@/services/legal-document-detection-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = 'current-user' // In production, extract from session
    const documentId = searchParams.get('documentId')

    if (documentId) {
      // Get specific document
      const document = legalDocumentDetectionService.getDocument(documentId)
      
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      // Check if user has access to this document
      if (document.userId !== userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      return NextResponse.json({ document })
    } else {
      // Get all user documents
      const documents = legalDocumentDetectionService.getUserDocuments(userId)
      
      return NextResponse.json({
        documents,
        count: documents.length
      })
    }
  } catch (error) {
    console.error('Error fetching legal documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch legal documents' },
      { status: 500 }
    )
  }
}