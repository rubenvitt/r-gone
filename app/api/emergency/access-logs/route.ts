import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const tokenId = searchParams.get('tokenId') || undefined;
    const contactId = searchParams.get('contactId') || undefined;
    const action = searchParams.get('action') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    
    const logs = await emergencyAccessService.getAccessLogs({
      tokenId,
      contactId,
      action,
      limit
    });

    return NextResponse.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Failed to get access logs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get access logs' 
      },
      { status: 500 }
    );
  }
}