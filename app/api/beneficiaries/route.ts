import { NextRequest, NextResponse } from 'next/server'
import { beneficiaryManagementService } from '@/services/beneficiary-management-service'
import { authService } from '@/services/auth-service'
import { auditLoggingService } from '@/services/audit-logging-service'
import { BeneficiaryFilter, BeneficiaryManagementSystem } from '@/types/data'
import path from 'path'
import { promises as fs } from 'fs'

const BENEFICIARY_DATA_FILE = path.join(process.cwd(), 'data', 'beneficiary-management.json')

async function loadBeneficiarySystem() {
  try {
    const data = await fs.readFile(BENEFICIARY_DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return beneficiaryManagementService.createEmptySystem()
  }
}

async function saveBeneficiarySystem(system: BeneficiaryManagementSystem) {
  await fs.mkdir(path.dirname(BENEFICIARY_DATA_FILE), { recursive: true })
  await fs.writeFile(BENEFICIARY_DATA_FILE, JSON.stringify(system, null, 2))
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const sessionValidation = await authService.validateSession(sessionId)
    if (!sessionValidation.valid) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter: BeneficiaryFilter = {
      trustLevel: (searchParams.get('trustLevel') || undefined) as BeneficiaryFilter['trustLevel'],
      accessLevel: (searchParams.get('accessLevel') || undefined) as BeneficiaryFilter['accessLevel'],
      status: (searchParams.get('status') || undefined) as BeneficiaryFilter['status'],
      relationship: (searchParams.get('relationship') || undefined) as BeneficiaryFilter['relationship'],
      invitationStatus: (searchParams.get('invitationStatus') || undefined) as BeneficiaryFilter['invitationStatus'],
      hasRecentAccess: searchParams.get('hasRecentAccess') === 'true',
      search: searchParams.get('search') || undefined
    }

    const system = await loadBeneficiarySystem()
    const beneficiaries = beneficiaryManagementService.filterBeneficiaries(system, filter)

    await auditLoggingService.logEvent({
      eventType: 'data_access',
      action: 'list_beneficiaries',
      resource: 'beneficiary',
      result: 'success',
      details: {
        totalBeneficiaries: beneficiaries.length,
        filter
      },
      riskLevel: 'low',
      userId: sessionValidation.userId
    })

    return NextResponse.json({
      success: true,
      beneficiaries,
      statistics: system.statistics,
      groups: system.groups
    })
  } catch (error) {
    console.error('Failed to get beneficiaries:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve beneficiaries' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const sessionValidation = await authService.validateSession(sessionId)
    if (!sessionValidation.valid) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    const options = await request.json()
    const system = await loadBeneficiarySystem()
    
    const updatedSystem = await beneficiaryManagementService.addBeneficiary(
      system,
      options,
      sessionValidation.userId
    )
    
    await saveBeneficiarySystem(updatedSystem)

    return NextResponse.json({
      success: true,
      message: 'Beneficiary added successfully',
      beneficiary: updatedSystem.beneficiaries[updatedSystem.beneficiaries.length - 1],
      statistics: updatedSystem.statistics
    })
  } catch (error) {
    await auditLoggingService.logEvent({
      eventType: 'admin_action',
      action: 'add_beneficiary',
      resource: 'beneficiary',
      result: 'failure',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      riskLevel: 'medium'
    })

    console.error('Failed to add beneficiary:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add beneficiary' },
      { status: 500 }
    )
  }
}