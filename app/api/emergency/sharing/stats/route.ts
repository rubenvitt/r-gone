import { NextResponse } from 'next/server';
import { emergencySharingService } from '@/services/emergency-sharing-service';

export async function GET() {
  try {
    const stats = await emergencySharingService.getSharingStats();

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Failed to get sharing statistics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get sharing statistics'
      },
      { status: 500 }
    );
  }
}