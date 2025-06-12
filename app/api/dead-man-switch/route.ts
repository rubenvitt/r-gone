import { NextRequest, NextResponse } from 'next/server';
import { deadManSwitchService } from '../../../services/dead-man-switch-service';

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

// GET /api/dead-man-switch - Get all Dead Man's Switches
export async function GET(request: NextRequest) {
    try {
        const switches = await deadManSwitchService.getAllSwitches();
        
        // Sanitize data to avoid circular references
        const sanitizedSwitches = switches.map(sanitizeDeadManSwitch);
        
        return NextResponse.json({
            success: true,
            data: sanitizedSwitches
        });
    } catch (error) {
        console.error('Error fetching Dead Man Switches:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch Dead Man Switches'
        }, { status: 500 });
    }
}

// POST /api/dead-man-switch - Create a new Dead Man's Switch
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, configuration } = body;

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        const deadManSwitch = await deadManSwitchService.createDeadManSwitch(
            userId,
            configuration
        );
        
        // Sanitize data to avoid circular references
        const sanitizedSwitch = sanitizeDeadManSwitch(deadManSwitch);
        
        return NextResponse.json({
            success: true,
            data: sanitizedSwitch
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating Dead Man Switch:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to create Dead Man Switch'
        }, { status: 500 });
    }
}