import { NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function POST() {
  try {
    const result = await emergencyAccessService.cleanupExpiredTokens();

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Failed to cleanup expired tokens:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cleanup failed'
      },
      { status: 500 }
    );
  }
}