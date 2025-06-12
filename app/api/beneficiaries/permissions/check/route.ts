import { NextRequest, NextResponse } from 'next/server'
import { beneficiaryManagementService } from '@/services/beneficiary-management-service'
import { BeneficiaryPermissions } from '@/types/data'
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

export async function POST(request: NextRequest) {
  try {
    const { beneficiaryId, permission, context } = await request.json()
    
    if (!beneficiaryId || !permission) {
      return NextResponse.json({ 
        success: false, 
        error: 'Beneficiary ID and permission are required' 
      }, { status: 400 })
    }

    const system = await loadBeneficiarySystem()
    const beneficiary = system.beneficiaries.find(b => b.id === beneficiaryId)
    
    if (!beneficiary) {
      return NextResponse.json({ 
        success: false, 
        error: 'Beneficiary not found' 
      }, { status: 404 })
    }

    // Check basic permission
    const hasPermission = beneficiaryManagementService.hasPermission(
      beneficiary,
      permission as keyof BeneficiaryPermissions
    )

    // Check access restrictions if permission is granted
    let accessAllowed = true
    let accessReason: string | undefined
    
    if (hasPermission && context) {
      const accessCheck = beneficiaryManagementService.checkAccessRestrictions(
        beneficiary,
        context
      )
      accessAllowed = accessCheck.allowed
      accessReason = accessCheck.reason
    }

    return NextResponse.json({
      success: true,
      hasPermission,
      accessAllowed,
      accessReason,
      beneficiary: {
        id: beneficiary.id,
        name: beneficiary.name,
        email: beneficiary.email,
        trustLevel: beneficiary.trustLevel,
        accessLevel: beneficiary.accessLevel,
        status: beneficiary.status
      }
    })
  } catch (error) {
    console.error('Failed to check permissions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check permissions' },
      { status: 500 }
    )
  }
}