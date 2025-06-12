import { NextRequest, NextResponse } from 'next/server';
import { emergencySharingService, ShareTokenRequest } from '@/services/emergency-sharing-service';

export async function POST(request: NextRequest) {
  try {
    const shareRequest: ShareTokenRequest = await request.json();

    // Validate required fields
    if (!shareRequest.tokenId || !shareRequest.contactId || !shareRequest.methods || shareRequest.methods.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token ID, contact ID, and at least one sharing method are required' 
        },
        { status: 400 }
      );
    }

    // Validate methods
    const validMethods = ['email', 'sms', 'qr', 'print', 'link'];
    for (const method of shareRequest.methods) {
      if (!validMethods.includes(method.type)) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid sharing method: ${method.type}. Must be one of: ${validMethods.join(', ')}` 
          },
          { status: 400 }
        );
      }

      if ((method.type === 'email' || method.type === 'sms') && !method.recipient) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Recipient is required for ${method.type} sharing` 
          },
          { status: 400 }
        );
      }
    }

    const result = await emergencySharingService.shareToken(shareRequest);

    return NextResponse.json({
      success: result.success,
      sharingRecords: result.sharingRecords,
      errors: result.errors
    });
  } catch (error) {
    console.error('Failed to share emergency access:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to share emergency access'
      },
      { status: 500 }
    );
  }
}