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
    const { documentId } = body

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    const courtDocument = await legalIntegrationService.fileWithCourt(documentId)

    return NextResponse.json({
      success: true,
      courtDocument
    })
  } catch (error) {
    console.error('Error filing with court:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to file with court' },
      { status: 500 }
    )
  }
}