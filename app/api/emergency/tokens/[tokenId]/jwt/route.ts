import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function GET(
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

    // Get the token data
    const token = await emergencyAccessService.getToken(tokenId);
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token not found' 
        },
        { status: 404 }
      );
    }

    // Check if token is still valid
    if (token.revokedAt) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token has been revoked' 
        },
        { status: 403 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    if (now > expiresAt) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token has expired' 
        },
        { status: 403 }
      );
    }

    // Generate JWT token for this existing token
    const jwtToken = await emergencyAccessService.generateJwtForToken(tokenId);

    return NextResponse.json({
      success: true,
      jwtToken
    });
  } catch (error) {
    console.error('Failed to generate JWT for token:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate JWT token' 
      },
      { status: 500 }
    );
  }
}