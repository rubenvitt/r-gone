import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backup-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { backupId: string } }
) {
  try {
    const { backupId } = params;
    const { 
      fileIds,
      overwriteExisting = false,
      restoreToNewIds = false,
      dryRun = false
    } = await request.json();

    // Validate fileIds if provided
    if (fileIds && (!Array.isArray(fileIds) || fileIds.some(id => typeof id !== 'string'))) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'fileIds must be an array of strings' 
        },
        { status: 400 }
      );
    }

    const result = await backupService.restoreFromBackup(backupId, {
      fileIds,
      overwriteExisting,
      restoreToNewIds,
      dryRun
    });

    return NextResponse.json({
      success: result.success,
      restoredFiles: result.restoredFiles,
      failedFiles: result.failedFiles,
      conflicts: result.conflicts,
      error: result.error
    });
  } catch (error) {
    console.error(`Failed to restore from backup ${params.backupId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Restore failed'
      },
      { status: 500 }
    );
  }
}