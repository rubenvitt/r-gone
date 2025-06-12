import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contactId = searchParams.get('contactId') || undefined;
    const includeExpired = searchParams.get('includeExpired') === 'true';
    
    // Get all contacts first
    const contacts = await emergencyAccessService.listContacts();
    const allTokens = [];

    // Get tokens for each contact
    for (const contact of contacts) {
      if (!contactId || contact.id === contactId) {
        const tokens = await emergencyAccessService.getContactTokens(contact.id);
        for (const token of tokens) {
          const isExpired = new Date(token.expiresAt) < new Date();
          const isUsedUp = token.currentUses >= token.maxUses;
          
          if (includeExpired || (!isExpired && !isUsedUp && !token.revokedAt)) {
            allTokens.push({
              ...token,
              contactName: contact.name,
              contactEmail: contact.email,
              isExpired,
              isUsedUp,
              isActive: !isExpired && !isUsedUp && !token.revokedAt
            });
          }
        }
      }
    }

    // Sort by creation date (newest first)
    allTokens.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      tokens: allTokens
    });
  } catch (error) {
    console.error('Failed to list tokens:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list tokens' 
      },
      { status: 500 }
    );
  }
}