import { NextRequest, NextResponse } from 'next/server';
import { backupVerificationService } from '@/services/backup-verification-service';

export async function POST(request: NextRequest) {
  try {
    const { 
      includeFileVerification = true,
      includeRestoreTests = false,
      maxBackupsToCheck = 50
    } = await request.json();

    const report = await backupVerificationService.generateSystemIntegrityReport({
      includeFileVerification,
      includeRestoreTests,
      maxBackupsToCheck
    });

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Failed to generate system integrity report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'System verification failed'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const reports = await backupVerificationService.getReports(10);

    return NextResponse.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Failed to get verification reports:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get verification reports' 
      },
      { status: 500 }
    );
  }
}