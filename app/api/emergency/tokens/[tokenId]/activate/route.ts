import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = params.tokenId;

    if (!tokenId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token ID is required' 
        },
        { status: 400 }
      );
    }

    // Activate the token
    await emergencyAccessService.activateToken(tokenId);

    // Get updated token data
    const tokenData = await emergencyAccessService.getToken(tokenId);

    return NextResponse.json({
      success: true,
      tokenData,
      message: 'Token activated successfully'
    });
  } catch (error) {
    console.error('Failed to activate token:', error);
    
    let errorMessage = 'Failed to activate token';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('revoked')) {
        statusCode = 403;
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: statusCode }
    );
  }
}