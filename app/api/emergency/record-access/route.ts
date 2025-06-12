import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function POST(request: NextRequest) {
  try {
    const { token, fileId } = await request.json();

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token is required' 
        },
        { status: 400 }
      );
    }

    // Validate the token first
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const validation = await emergencyAccessService.validateToken(token, {
      ipAddress,
      checkExpiration: true,
      checkUses: true,
      checkIpRestrictions: true
    });

    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error || 'Invalid token'
        },
        { status: 401 }
      );
    }

    // Record the token usage
    await emergencyAccessService.recordTokenUsage(validation.token!.id, {
      ipAddress,
      userAgent,
      fileAccessed: fileId
    });

    return NextResponse.json({
      success: true,
      message: 'Access recorded successfully',
      remainingUses: validation.token!.maxUses - validation.token!.currentUses - 1
    });
  } catch (error) {
    console.error('Failed to record access:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to record access'
      },
      { status: 500 }
    );
  }
}