import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backup-service';

export async function POST(request: NextRequest) {
  try {
    const { 
      fileIds, 
      includeMetadata = true, 
      format = 'zip' 
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

    const result = await backupService.createExportArchive({
      fileIds,
      includeMetadata,
      format
    });

    return NextResponse.json({
      success: result.success,
      exportId: result.exportId,
      error: result.error
    });
  } catch (error) {
    console.error('Failed to create export:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Export creation failed'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const exports = await backupService.listExports();

    return NextResponse.json({
      success: true,
      exports
    });
  } catch (error) {
    console.error('Failed to list exports:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list exports' 
      },
      { status: 500 }
    );
  }
}