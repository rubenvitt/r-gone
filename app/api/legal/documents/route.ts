import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService, LegalDocumentType, LegalDocumentStatus } from '@/services/legal-integration-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const searchParams = request.nextUrl.searchParams
    
    const filter = {
      type: searchParams.get('type') as LegalDocumentType | undefined,
      status: searchParams.get('status') as LegalDocumentStatus | undefined,
      jurisdiction: searchParams.get('jurisdiction') || undefined
    }

    const documents = await legalIntegrationService.getUserDocuments(
      session.userId,
      filter
    )

    return NextResponse.json({
      success: true,
      documents
    })
  } catch (error) {
    console.error('Error fetching legal documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch legal documents' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const body = await request.json()
    
    const { type, ...data } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Document type is required' },
        { status: 400 }
      )
    }

    const document = await legalIntegrationService.createLegalDocument(
      session.userId,
      type as LegalDocumentType,
      data
    )

    return NextResponse.json({
      success: true,
      document
    })
  } catch (error) {
    console.error('Error creating legal document:', error)
    return NextResponse.json(
      { error: 'Failed to create legal document' },
      { status: 500 }
    )
  }
}