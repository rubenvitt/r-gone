import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backup-service';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { exportId: string } }
) {
  try {
    const { exportId } = params;
    const exports = await backupService.listExports();
    const exportInfo = exports.find(e => e.exportId === exportId);

    if (!exportInfo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Export not found' 
        },
        { status: 404 }
      );
    }

    // Read the export manifest for detailed information
    const manifestPath = path.join(exportInfo.path, 'export-manifest.json');
    try {
      const manifestData = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestData);

      return NextResponse.json({
        success: true,
        export: {
          ...exportInfo,
          manifest
        }
      });
    } catch {
      return NextResponse.json({
        success: true,
        export: exportInfo
      });
    }
  } catch (error) {
    console.error(`Failed to get export details for ${params.exportId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get export details' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { exportId: string } }
) {
  try {
    const { exportId } = params;

    const success = await backupService.deleteExport(exportId);
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete export' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Export deleted successfully'
    });
  } catch (error) {
    console.error(`Failed to delete export ${params.exportId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete export' 
      },
      { status: 500 }
    );
  }
}