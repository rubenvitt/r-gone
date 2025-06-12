import { NextRequest, NextResponse } from 'next/server';
import { socialRecoveryService } from '../../../../../../services/social-recovery-service';

interface RouteParams {
    params: {
        contactId: string;
    };
}

// GET /api/recovery/social/contact/[contactId] - Get trusted contact details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { contactId } = params;
        
        const contact = await socialRecoveryService.getTrustedContact(contactId);
        
        if (!contact) {
            return NextResponse.json({
                success: false,
                error: 'Trusted contact not found'
            }, { status: 404 });
        }
        
        return NextResponse.json({
            success: true,
            data: contact
        });
    } catch (error) {
        console.error('Error fetching trusted contact:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch trusted contact'
        }, { status: 500 });
    }
}

// PUT /api/recovery/social/contact/[contactId] - Update trusted contact
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { contactId } = params;
        const body = await request.json();
        
        const updatedContact = await socialRecoveryService.updateTrustedContact(contactId, body);
        
        return NextResponse.json({
            success: true,
            data: updatedContact
        });
    } catch (error) {
        console.error('Error updating trusted contact:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update trusted contact'
        }, { status: 500 });
    }
}

// DELETE /api/recovery/social/contact/[contactId] - Remove trusted contact
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { contactId } = params;
        
        const success = await socialRecoveryService.removeTrustedContact(contactId);
        
        if (success) {
            return NextResponse.json({
                success: true,
                data: {
                    message: 'Trusted contact removed successfully'
                }
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Failed to remove trusted contact'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error removing trusted contact:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to remove trusted contact'
        }, { status: 500 });
    }
}

// POST /api/recovery/social/contact/[contactId] - Contact-specific actions
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { contactId } = params;
        const body = await request.json();
        const { action } = body;

        if (action === 'test_reachability') {
            const reachable = await socialRecoveryService.testContactReachability(contactId);
            
            return NextResponse.json({
                success: true,
                data: {
                    reachable,
                    message: reachable ? 'Contact is reachable' : 'Contact is not reachable'
                }
            });

        } else if (action === 'resend_verification') {
            const contact = await socialRecoveryService.getTrustedContact(contactId);
            
            if (!contact) {
                return NextResponse.json({
                    success: false,
                    error: 'Trusted contact not found'
                }, { status: 404 });
            }

            if (contact.isVerified) {
                return NextResponse.json({
                    success: false,
                    error: 'Contact is already verified'
                }, { status: 400 });
            }

            await socialRecoveryService.sendVerificationInvitation(contact);
            
            return NextResponse.json({
                success: true,
                data: {
                    message: 'Verification invitation resent successfully'
                }
            });

        } else {
            return NextResponse.json({
                success: false,
                error: 'Invalid action. Use "test_reachability" or "resend_verification"'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error processing contact action:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process contact action'
        }, { status: 500 });
    }
}