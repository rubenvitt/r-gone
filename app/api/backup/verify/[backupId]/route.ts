import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backup-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { backupId: string } }
) {
  try {
    const { backupId } = params;

    const verification = await backupService.verifyBackup(backupId);

    return NextResponse.json({
      success: true,
      verification
    });
  } catch (error) {
    console.error(`Failed to verify backup ${params.backupId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify backup' 
      },
      { status: 500 }
    );
  }
}