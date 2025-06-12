import { NextRequest, NextResponse } from 'next/server'
import { beneficiaryManagementService } from '@/services/beneficiary-management-service'
import { VerificationMethod, BeneficiaryManagementSystem } from '@/types/data'
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

// Create verification
export async function POST(request: NextRequest) {
  try {
    const { beneficiaryId, method } = await request.json()
    
    if (!beneficiaryId || !method) {
      return NextResponse.json({ 
        success: false, 
        error: 'Beneficiary ID and verification method are required' 
      }, { status: 400 })
    }

    const system = await loadBeneficiarySystem()
    
    const verification = await beneficiaryManagementService.createVerification(
      system,
      beneficiaryId,
      method as VerificationMethod
    )
    
    // Update system with new verification
    system.verifications.push(verification)
    await saveBeneficiarySystem(system)

    return NextResponse.json({
      success: true,
      message: 'Verification initiated successfully',
      verification: {
        beneficiaryId: verification.beneficiaryId,
        method: verification.method,
        expiresAt: verification.expiresAt
      }
    })
  } catch (error) {
    console.error('Failed to create verification:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create verification' },
      { status: 500 }
    )
  }
}

// Verify beneficiary
export async function PUT(request: NextRequest) {
  try {
    const { beneficiaryId, token } = await request.json()
    
    if (!beneficiaryId || !token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Beneficiary ID and verification token are required' 
      }, { status: 400 })
    }

    const system = await loadBeneficiarySystem()
    
    const beneficiary = await beneficiaryManagementService.verifyBeneficiary(
      system,
      beneficiaryId,
      token
    )
    
    await saveBeneficiarySystem(system)

    return NextResponse.json({
      success: true,
      message: 'Beneficiary verified successfully',
      beneficiary
    })
  } catch (error) {
    console.error('Failed to verify beneficiary:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to verify beneficiary' },
      { status: 500 }
    )
  }
}