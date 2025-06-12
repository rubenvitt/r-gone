import { NextRequest, NextResponse } from 'next/server'
import { beneficiaryManagementService } from '@/services/beneficiary-management-service'
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
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 })
    }

    const system = await loadBeneficiarySystem()
    
    const result = await beneficiaryManagementService.acceptInvitation(system, token)
    
    await saveBeneficiarySystem(system)

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      beneficiary: result.beneficiary,
      requiresVerification: result.requiresVerification
    })
  } catch (error) {
    console.error('Failed to accept invitation:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}