import { NextRequest, NextResponse } from 'next/server';
import { deadManSwitchService } from '../../../../services/dead-man-switch-service';

// POST /api/dead-man-switch/monitoring - Manually trigger monitoring check
export async function POST(request: NextRequest) {
    try {
        await deadManSwitchService.monitorSwitches();
        
        return NextResponse.json({
            success: true,
            message: 'Monitoring check completed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error during monitoring check:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to complete monitoring check'
        }, { status: 500 });
    }
}