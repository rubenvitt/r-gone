import { NextRequest, NextResponse } from 'next/server'
import { auditLoggingService } from '@/services/audit-logging-service'
import { logSystemAccess } from '@/utils/audit-utils'

export async function GET(request: NextRequest) {
  try {
    await logSystemAccess('verify_audit_integrity', 'success', request)
    
    const verification = await auditLoggingService.verifyLogIntegrity()
    
    return NextResponse.json({
      success: true,
      verification
    })
  } catch (error) {
    await logSystemAccess('verify_audit_integrity', 'error', request, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    console.error('Failed to verify audit log integrity:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify audit log integrity' 
      },
      { status: 500 }
    )
  }
}