import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { legalIntegrationService, Jurisdiction, LegalDocumentType } from '@/services/legal-integration-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const country = searchParams.get('country')
    const state = searchParams.get('state')
    const documentType = searchParams.get('documentType') as LegalDocumentType

    if (!country || !documentType) {
      return NextResponse.json(
        { error: 'Country and document type are required' },
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

    const requirements = await legalIntegrationService.getJurisdictionRequirements(
      jurisdiction,
      documentType
    )

    return NextResponse.json({
      success: true,
      requirements
    })
  } catch (error) {
    console.error('Error fetching jurisdiction requirements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jurisdiction requirements' },
      { status: 500 }
    )
  }
}