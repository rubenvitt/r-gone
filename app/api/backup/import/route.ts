import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backup-service';

export async function POST(request: NextRequest) {
  try {
    const { 
      archivePath,
      overwriteExisting = false,
      skipOnConflict = false,
      validateIntegrity = true,
      dryRun = false
    } = await request.json();

    if (!archivePath || typeof archivePath !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'archivePath is required and must be a string' 
        },
        { status: 400 }
      );
    }

    const result = await backupService.importFromArchive(archivePath, {
      overwriteExisting,
      skipOnConflict,
      validateIntegrity,
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
    console.error('Failed to import archive:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Import failed'
      },
      { status: 500 }
    );
  }
}