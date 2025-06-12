import { NextRequest, NextResponse } from 'next/server';
import { deadManSwitchService } from '../../../../../services/dead-man-switch-service';

interface RouteParams {
    params: {
        switchId: string;
    };
}

// POST /api/dead-man-switch/[switchId]/enable - Enable Dead Man's Switch
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { switchId } = params;
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        const success = await deadManSwitchService.enableSwitch(switchId, userId);
        
        return NextResponse.json({
            success,
            message: 'Dead Man Switch enabled successfully'
        });
    } catch (error) {
        console.error('Error enabling Dead Man Switch:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to enable Dead Man Switch'
        }, { status: 500 });
    }
}