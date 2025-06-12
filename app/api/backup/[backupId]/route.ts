import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backup-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { backupId: string } }
) {
  try {
    const { backupId } = params;

    const details = await backupService.getBackupDetails(backupId);
    
    if (!details) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backup not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...details
    });
  } catch (error) {
    console.error(`Failed to get backup details for ${params.backupId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get backup details' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { backupId: string } }
) {
  try {
    const { backupId } = params;

    const success = await backupService.deleteBackup(backupId);
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete backup' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error(`Failed to delete backup ${params.backupId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete backup' 
      },
      { status: 500 }
    );
  }
}