import { NextResponse } from 'next/server';
import { backupService } from '@/services/backup-service';

export async function GET() {
  try {
    const stats = await backupService.getStats();

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Failed to get backup stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get backup statistics' 
      },
      { status: 500 }
    );
  }
}