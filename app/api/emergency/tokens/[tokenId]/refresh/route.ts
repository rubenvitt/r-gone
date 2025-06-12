import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = params.tokenId;
    const body = await request.json();
    const { extensionHours } = body;

    if (!tokenId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token ID is required' 
        },
        { status: 400 }
      );
    }

    // Refresh the token
    const result = await emergencyAccessService.refreshToken(tokenId, extensionHours);

    return NextResponse.json({
      success: true,
      token: result.token,
      url: result.url,
      tokenData: result.tokenData,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Failed to refresh token:', error);
    
    let errorMessage = 'Failed to refresh token';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('revoked') || error.message.includes('not refreshable')) {
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