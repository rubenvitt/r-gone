import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function POST(request: NextRequest) {
  try {
    const { tokenId, reason } = await request.json();

    if (!tokenId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token ID is required' 
        },
        { status: 400 }
      );
    }

    await emergencyAccessService.revokeToken(tokenId, reason);

    return NextResponse.json({
      success: true,
      message: 'Token revoked successfully'
    });
  } catch (error) {
    console.error('Failed to revoke token:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to revoke token' 
      },
      { status: 500 }
    );
  }
}