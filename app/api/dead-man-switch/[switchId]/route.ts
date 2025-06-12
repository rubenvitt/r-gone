import { NextRequest, NextResponse } from 'next/server';
import { deadManSwitchService } from '../../../../services/dead-man-switch-service';

// Helper function to safely serialize Dead Man's Switch data
function sanitizeDeadManSwitch(deadManSwitch: any) {
    return {
        ...deadManSwitch,
        auditTrail: deadManSwitch.auditTrail?.map((entry: any) => ({
            ...entry,
            newState: undefined, // Remove circular reference
            oldState: undefined  // Remove potential circular reference
        })) || []
    };
}

interface RouteParams {
    params: {
        switchId: string;
    };
}

// GET /api/dead-man-switch/[switchId] - Get specific Dead Man's Switch
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { switchId } = params;
        const deadManSwitch = await deadManSwitchService.getDeadManSwitch(switchId);
        
        if (!deadManSwitch) {
            return NextResponse.json({
                success: false,
                error: 'Dead Man Switch not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: sanitizeDeadManSwitch(deadManSwitch)
        });
    } catch (error) {
        console.error('Error fetching Dead Man Switch:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch Dead Man Switch'
        }, { status: 500 });
    }
}

// PUT /api/dead-man-switch/[switchId] - Update Dead Man's Switch configuration
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { switchId } = params;
        const body = await request.json();
        const { userId, configuration } = body;

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        const updatedSwitch = await deadManSwitchService.updateSwitchConfiguration(
            switchId,
            userId,
            configuration
        );
        
        return NextResponse.json({
            success: true,
            data: sanitizeDeadManSwitch(updatedSwitch)
        });
    } catch (error) {
        console.error('Error updating Dead Man Switch:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update Dead Man Switch'
        }, { status: 500 });
    }
}

// DELETE /api/dead-man-switch/[switchId] - Disable Dead Man's Switch
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { switchId } = params;
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        const success = await deadManSwitchService.disableSwitch(switchId, userId);
        
        return NextResponse.json({
            success,
            message: 'Dead Man Switch disabled successfully'
        });
    } catch (error) {
        console.error('Error disabling Dead Man Switch:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to disable Dead Man Switch'
        }, { status: 500 });
    }
}