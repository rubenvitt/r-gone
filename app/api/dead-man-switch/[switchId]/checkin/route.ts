import { NextRequest, NextResponse } from 'next/server';
import { deadManSwitchService } from '../../../../../services/dead-man-switch-service';
import { CheckInType } from '../../../../../types/data';

interface RouteParams {
    params: {
        switchId: string;
    };
}

// POST /api/dead-man-switch/[switchId]/checkin - Record user activity
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { switchId } = params;
        const body = await request.json();
        const { userId, method, metadata } = body;

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        if (!method || !Object.values(['app_login', 'email_response', 'sms_response', 'phone_call', 'web_checkin', 'biometric', 'api_token', 'manual_trigger']).includes(method)) {
            return NextResponse.json({
                success: false,
                error: 'Valid check-in method is required'
            }, { status: 400 });
        }

        const success = await deadManSwitchService.recordActivity(
            switchId,
            userId,
            method as CheckInType,
            metadata
        );
        
        return NextResponse.json({
            success,
            message: 'Activity recorded successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error recording activity:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to record activity'
        }, { status: 500 });
    }
}