import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const { contactId } = params;
    const tokens = await emergencyAccessService.getContactTokens(contactId);
    
    return NextResponse.json({
      success: true,
      tokens
    });
  } catch (error) {
    console.error(`Failed to get tokens for contact ${params.contactId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get contact tokens' 
      },
      { status: 500 }
    );
  }
}