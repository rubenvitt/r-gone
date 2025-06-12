import { NextRequest, NextResponse } from 'next/server';
import { emergencySharingService } from '@/services/emergency-sharing-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    const contactId = searchParams.get('contactId');
    const method = searchParams.get('method');
    const limit = searchParams.get('limit');

    const options: {
      tokenId?: string;
      contactId?: string;
      method?: string;
      limit?: number;
    } = {};
    if (tokenId) options.tokenId = tokenId;
    if (contactId) options.contactId = contactId;
    if (method) options.method = method;
    if (limit) options.limit = parseInt(limit);

    const records = await emergencySharingService.getSharingRecords(options);

    return NextResponse.json({
      success: true,
      records
    });
  } catch (error) {
    console.error('Failed to get sharing records:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get sharing records'
      },
      { status: 500 }
    );
  }
}