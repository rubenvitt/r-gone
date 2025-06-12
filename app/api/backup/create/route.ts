import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backup-service';

export async function POST(request: NextRequest) {
  try {
    const { type = 'manual' } = await request.json();

    if (!['manual', 'automatic'].includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid backup type. Must be "manual" or "automatic"' 
        },
        { status: 400 }
      );
    }

    let backup;
    if (type === 'manual') {
      backup = await backupService.createManualBackup();
    } else {
      backup = await backupService.createAutomaticBackup();
    }

    return NextResponse.json({
      success: true,
      backup
    });
  } catch (error) {
    console.error('Failed to create backup:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create backup'
      },
      { status: 500 }
    );
  }
}