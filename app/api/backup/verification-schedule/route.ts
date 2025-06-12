import { NextRequest, NextResponse } from 'next/server';
import { backupVerificationService, VerificationSchedule } from '@/services/backup-verification-service';

export async function GET() {
  try {
    const schedule = await backupVerificationService.getSchedule();

    return NextResponse.json({
      success: true,
      schedule
    });
  } catch (error) {
    console.error('Failed to get verification schedule:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get verification schedule' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const schedule: VerificationSchedule = await request.json();

    // Validate schedule
    if (!['daily', 'weekly', 'monthly'].includes(schedule.frequency)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid frequency. Must be daily, weekly, or monthly' 
        },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(schedule.time)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid time format. Use HH:MM format (24-hour)' 
        },
        { status: 400 }
      );
    }

    await backupVerificationService.saveSchedule(schedule);

    return NextResponse.json({
      success: true,
      schedule
    });
  } catch (error) {
    console.error('Failed to update verification schedule:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update verification schedule' 
      },
      { status: 500 }
    );
  }
}