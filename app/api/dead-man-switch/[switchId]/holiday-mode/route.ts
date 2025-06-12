import { NextRequest, NextResponse } from 'next/server';
import { deadManSwitchService } from '../../../../../services/dead-man-switch-service';

interface RouteParams {
    params: {
        switchId: string;
    };
}

// POST /api/dead-man-switch/[switchId]/holiday-mode - Activate holiday mode
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { switchId } = params;
        const body = await request.json();
        const { userId, startDate, endDate, reason } = body;

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        if (!startDate || !endDate) {
            return NextResponse.json({
                success: false,
                error: 'Start date and end date are required'
            }, { status: 400 });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        if (start >= end) {
            return NextResponse.json({
                success: false,
                error: 'End date must be after start date'
            }, { status: 400 });
        }

        if (start < now) {
            return NextResponse.json({
                success: false,
                error: 'Start date cannot be in the past'
            }, { status: 400 });
        }

        // Maximum holiday duration of 90 days
        const maxDuration = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
        if (end.getTime() - start.getTime() > maxDuration) {
            return NextResponse.json({
                success: false,
                error: 'Holiday mode cannot exceed 90 days'
            }, { status: 400 });
        }

        const success = await deadManSwitchService.activateHolidayMode(
            switchId,
            userId,
            startDate,
            endDate,
            reason
        );
        
        return NextResponse.json({
            success,
            message: 'Holiday mode activated successfully',
            startDate,
            endDate,
            duration: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        });
    } catch (error) {
        console.error('Error activating holiday mode:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to activate holiday mode'
        }, { status: 500 });
    }
}