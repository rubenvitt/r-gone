import { NextResponse } from 'next/server';
import { backupVerificationService } from '@/services/backup-verification-service';

export async function POST() {
  try {
    const result = await backupVerificationService.performMaintenance();

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Failed to perform backup maintenance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Maintenance failed'
      },
      { status: 500 }
    );
  }
}