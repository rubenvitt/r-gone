import { NextRequest, NextResponse } from 'next/server';
import { socialRecoveryService } from '../../../../../../services/social-recovery-service';

interface RouteParams {
    params: {
        approvalId: string;
    };
}

// GET /api/recovery/social/approve/[approvalId] - Get approval request details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { approvalId } = params;
        
        // In a real implementation, would fetch approval details
        // For now, return mock approval request info
        return NextResponse.json({
            success: true,
            data: {
                approvalId,
                status: 'pending',
                requestedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                recoveryType: 'social_recovery',
                requesterInfo: {
                    // Would include limited info about the account being recovered
                    accountHint: 'Account ending in ***@example.com',
                    requestedAt: new Date().toISOString()
                },
                securityNotice: 'This is a request to help recover access to a secure account. Only approve if you recognize this request.'
            }
        });
    } catch (error) {
        console.error('Error fetching approval request:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch approval request'
        }, { status: 500 });
    }
}

// POST /api/recovery/social/approve/[approvalId] - Process approval response
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { approvalId } = params;
        const body = await request.json();
        const { approved, securityCode, comments, verificationData } = body;
        
        if (typeof approved !== 'boolean') {
            return NextResponse.json({
                success: false,
                error: 'Approval decision (approved: true/false) is required'
            }, { status: 400 });
        }
        
        if (!securityCode) {
            return NextResponse.json({
                success: false,
                error: 'Security code is required'
            }, { status: 400 });
        }
        
        const approval = await socialRecoveryService.processApprovalResponse(approvalId, {
            approved,
            securityCode,
            comments,
            verificationData
        });
        
        return NextResponse.json({
            success: true,
            data: {
                message: approved ? 'Recovery request approved' : 'Recovery request denied',
                approval,
                status: approval.status
            }
        });
    } catch (error) {
        console.error('Error processing approval response:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process approval response'
        }, { status: 500 });
    }
}