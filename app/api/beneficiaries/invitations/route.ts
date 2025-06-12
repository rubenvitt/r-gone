import { NextRequest, NextResponse } from 'next/server'
import { beneficiaryManagementService } from '@/services/beneficiary-management-service'
import { authService } from '@/services/auth-service'
import { BeneficiaryManagementSystem } from '@/types/data'
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

    const { beneficiaryId, message } = await request.json()
    
    if (!beneficiaryId) {
      return NextResponse.json({ success: false, error: 'Beneficiary ID is required' }, { status: 400 })
    }

    const system = await loadBeneficiarySystem()
    
    const invitation = await beneficiaryManagementService.createInvitation(
      system,
      beneficiaryId,
      message,
      sessionValidation.userId
    )
    
    // Update system with new invitation
    system.invitations.push(invitation)
    await saveBeneficiarySystem(system)

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      invitation
    })
  } catch (error) {
    console.error('Failed to send invitation:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send invitation' },
      { status: 500 }
    )
  }
}