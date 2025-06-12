import { NextRequest, NextResponse } from 'next/server'
import { beneficiaryManagementService } from '@/services/beneficiary-management-service'
import { authService } from '@/services/auth-service'
import { auditLoggingService } from '@/services/audit-logging-service'
import { BeneficiaryManagementSystem, Beneficiary } from '@/types/data'
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionId = request.cookies.get('session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const sessionValidation = await authService.validateSession(sessionId)
    if (!sessionValidation.valid) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    const { id } = await params
    const system = await loadBeneficiarySystem()
    const beneficiary = system.beneficiaries.find((b: Beneficiary) => b.id === id)

    if (!beneficiary) {
      return NextResponse.json({ success: false, error: 'Beneficiary not found' }, { status: 404 })
    }

    await auditLoggingService.logEvent({
      eventType: 'data_access',
      action: 'get_beneficiary',
      resource: 'beneficiary',
      resourceId: id,
      result: 'success',
      details: {
        beneficiaryEmail: beneficiary.email,
        trustLevel: beneficiary.trustLevel
      },
      riskLevel: 'low',
      userId: sessionValidation.userId
    })

    return NextResponse.json({
      success: true,
      beneficiary
    })
  } catch (error) {
    console.error('Failed to get beneficiary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve beneficiary' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionId = request.cookies.get('session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const sessionValidation = await authService.validateSession(sessionId)
    if (!sessionValidation.valid) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    const { id } = await params
    const updates = await request.json()
    const system = await loadBeneficiarySystem()
    
    const updatedSystem = await beneficiaryManagementService.updateBeneficiary(
      system,
      id,
      updates,
      sessionValidation.userId
    )
    
    await saveBeneficiarySystem(updatedSystem)

    return NextResponse.json({
      success: true,
      message: 'Beneficiary updated successfully',
      beneficiary: updatedSystem.beneficiaries.find((b: Beneficiary) => b.id === id)
    })
  } catch (error) {
    console.error('Failed to update beneficiary:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update beneficiary' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionId = request.cookies.get('session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const sessionValidation = await authService.validateSession(sessionId)
    if (!sessionValidation.valid) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    const { id } = await params
    const system = await loadBeneficiarySystem()
    
    const updatedSystem = await beneficiaryManagementService.removeBeneficiary(
      system,
      id,
      sessionValidation.userId
    )
    
    await saveBeneficiarySystem(updatedSystem)

    return NextResponse.json({
      success: true,
      message: 'Beneficiary removed successfully'
    })
  } catch (error) {
    console.error('Failed to remove beneficiary:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to remove beneficiary' },
      { status: 500 }
    )
  }
}