import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';
import { logEmergencyAccess } from '@/utils/audit-utils';

export async function POST(request: NextRequest) {
  let token: string | undefined;
  
  try {
    const body = await request.json();
    token = body.token;

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token is required' 
        },
        { status: 400 }
      );
    }

    // Get IP address from request
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    const validation = await emergencyAccessService.validateToken(token, {
      ipAddress,
      checkExpiration: true,
      checkUses: true,
      checkIpRestrictions: true
    });

    if (!validation.valid) {
      await logEmergencyAccess('validate_token', token, 'failure', {
        error: validation.error,
        ipAddress
      }, request);
      
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error || 'Invalid token',
          valid: false
        },
        { status: 401 }
      );
    }

    await logEmergencyAccess('validate_token', token, 'success', {
      contactId: validation.contact?.id,
      remainingUses: validation.remainingUses,
      expiresIn: validation.expiresIn,
      ipAddress
    }, request);

    return NextResponse.json({
      success: true,
      valid: true,
      token: validation.token,
      contact: validation.contact,
      remainingUses: validation.remainingUses,
      expiresIn: validation.expiresIn
    });
  } catch (error) {
    await logEmergencyAccess('validate_token', token, 'error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, request);
    
    console.error('Failed to validate token:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to validate token' 
      },
      { status: 500 }
    );
  }
}