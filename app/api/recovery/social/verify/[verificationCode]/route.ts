import { NextRequest, NextResponse } from 'next/server';
import { socialRecoveryService } from '../../../../../../services/social-recovery-service';

interface RouteParams {
    params: {
        verificationCode: string;
    };
}

// GET /api/recovery/social/verify/[verificationCode] - Get verification details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { verificationCode } = params;
        
        // Find the contact by verification code (for displaying contact info to verify)
        const contacts = await socialRecoveryService.getAllTrustedContacts();
        const contact = contacts.find(c => c.verificationCode === verificationCode && !c.isVerified);
        
        if (!contact) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or expired verification code'
            }, { status: 404 });
        }
        
        // Return minimal contact info for verification
        return NextResponse.json({
            success: true,
            data: {
                contactName: contact.name,
                relationship: contact.relationship,
                email: contact.email,
                verificationRequired: true
            }
        });
    } catch (error) {
        console.error('Error fetching verification details:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch verification details'
        }, { status: 500 });
    }
}

// POST /api/recovery/social/verify/[verificationCode] - Verify trusted contact
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { verificationCode } = params;
        const body = await request.json();
        const { name, confirmationData } = body;
        
        if (!name) {
            return NextResponse.json({
                success: false,
                error: 'Name confirmation is required'
            }, { status: 400 });
        }
        
        const verified = await socialRecoveryService.verifyTrustedContact(verificationCode, {
            name,
            confirmationData: confirmationData || {}
        });
        
        if (verified) {
            return NextResponse.json({
                success: true,
                data: {
                    message: 'Contact verified successfully',
                    verified: true
                }
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Verification failed. Please check your information and try again.'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error verifying trusted contact:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to verify trusted contact'
        }, { status: 500 });
    }
}