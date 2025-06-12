import { NextRequest, NextResponse } from 'next/server';
import { recoveryService } from '../../../../../services/recovery-service';

interface RouteParams {
    params: {
        attemptId: string;
    };
}

// GET /api/recovery/attempt/[attemptId] - Get recovery attempt details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { attemptId } = params;
        
        const attempt = await recoveryService.getAttempt(attemptId);
        
        return NextResponse.json({
            success: true,
            data: attempt
        });
    } catch (error) {
        console.error('Error fetching recovery attempt:', error);
        return NextResponse.json({
            success: false,
            error: 'Recovery attempt not found'
        }, { status: 404 });
    }
}

// POST /api/recovery/attempt/[attemptId] - Process verification step or complete recovery
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { attemptId } = params;
        const body = await request.json();
        const { action, stepId, data } = body;

        if (action === 'verify_step') {
            if (!stepId || !data) {
                return NextResponse.json({
                    success: false,
                    error: 'Step ID and verification data are required'
                }, { status: 400 });
            }

            const updatedAttempt = await recoveryService.processVerificationStep(attemptId, stepId, data);
            
            return NextResponse.json({
                success: true,
                data: updatedAttempt
            });

        } else if (action === 'complete') {
            const result = await recoveryService.completeRecovery(attemptId);
            
            return NextResponse.json({
                success: true,
                data: {
                    completed: result,
                    message: result ? 'Recovery completed successfully' : 'Recovery failed'
                }
            });

        } else {
            return NextResponse.json({
                success: false,
                error: 'Invalid action. Use "verify_step" or "complete"'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error processing recovery attempt:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process recovery attempt'
        }, { status: 500 });
    }
}