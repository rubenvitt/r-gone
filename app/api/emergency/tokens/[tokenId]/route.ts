import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const { tokenId } = params;
    
    // We need to load the token file directly since the service doesn't expose getToken publicly
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      const tokenPath = path.join(process.cwd(), 'data', 'emergency-access', 'tokens', `${tokenId}.json`);
      const data = await fs.readFile(tokenPath, 'utf-8');
      const token = JSON.parse(data);
      
      // Get contact information
      const contact = await emergencyAccessService.getContact(token.contactId);
      
      const isExpired = new Date(token.expiresAt) < new Date();
      const isUsedUp = token.currentUses >= token.maxUses;
      
      return NextResponse.json({
        success: true,
        token: {
          ...token,
          contactName: contact?.name,
          contactEmail: contact?.email,
          isExpired,
          isUsedUp,
          isActive: !isExpired && !isUsedUp && !token.revokedAt
        }
      });
    } catch {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token not found' 
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`Failed to get token ${params.tokenId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get token details' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const { tokenId } = params;
    const { reason } = await request.json().catch(() => ({}));

    await emergencyAccessService.revokeToken(tokenId, reason || 'Manually revoked');

    return NextResponse.json({
      success: true,
      message: 'Token revoked successfully'
    });
  } catch (error) {
    console.error(`Failed to revoke token ${params.tokenId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to revoke token' 
      },
      { status: 500 }
    );
  }
}