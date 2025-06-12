import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backup-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'automatic' | 'manual' | 'before-delete' | undefined;
    const status = searchParams.get('status') as 'completed' | 'failed' | 'corrupted' | undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const backups = await backupService.listBackups({
      type,
      status,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      backups,
      count: backups.length
    });
  } catch (error) {
    console.error('Failed to list backups:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list backups' 
      },
      { status: 500 }
    );
  }
}