import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService, LegalDocumentType, Jurisdiction } from '@/services/legal-integration-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as LegalDocumentType
    const country = searchParams.get('country')
    const state = searchParams.get('state')

    if (!type || !country) {
      return NextResponse.json(
        { error: 'Document type and country are required' },
        { status: 400 }
      )
    }

    const jurisdiction: Jurisdiction = {
      country,
      state: state || undefined,
      requirements: {
        witnessCount: 2,
        notarizationRequired: false,
        filingRequired: false,
        specificForms: [],
        ageLimitations: [],
        capacityRequirements: [],
        languageRequirements: ['English']
      }
    }

    const templates = await legalIntegrationService.getTemplatesForJurisdiction(
      type,
      jurisdiction
    )

    return NextResponse.json({
      success: true,
      templates
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
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

    const body = await request.json()
    const { type, jurisdiction, ...data } = body

    if (!type || !jurisdiction) {
      return NextResponse.json(
        { error: 'Document type and jurisdiction are required' },
        { status: 400 }
      )
    }

    const template = await legalIntegrationService.createTemplate(
      type as LegalDocumentType,
      jurisdiction,
      data
    )

    return NextResponse.json({
      success: true,
      template
    })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}