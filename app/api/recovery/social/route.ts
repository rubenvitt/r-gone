import { NextRequest, NextResponse } from 'next/server';
import { socialRecoveryService } from '../../../../services/social-recovery-service';

// GET /api/recovery/social - Get social recovery data
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        switch (type) {
            case 'contacts':
                const contacts = await socialRecoveryService.getAllTrustedContacts();
                return NextResponse.json({
                    success: true,
                    data: contacts
                });

            case 'verified-contacts':
                const verifiedContacts = await socialRecoveryService.getVerifiedTrustedContacts();
                return NextResponse.json({
                    success: true,
                    data: verifiedContacts
                });

            case 'statistics':
                const statistics = await socialRecoveryService.getSocialRecoveryStatistics();
                return NextResponse.json({
                    success: true,
                    data: statistics
                });

            case 'validation':
                const validation = await socialRecoveryService.validateSocialRecoverySetup();
                return NextResponse.json({
                    success: true,
                    data: validation
                });

            default:
                const [allContacts, stats] = await Promise.all([
                    socialRecoveryService.getAllTrustedContacts(),
                    socialRecoveryService.getSocialRecoveryStatistics()
                ]);

                return NextResponse.json({
                    success: true,
                    data: {
                        contacts: allContacts,
                        statistics: stats
                    }
                });
        }
    } catch (error) {
        console.error('Error fetching social recovery data:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch social recovery data'
        }, { status: 500 });
    }
}

// POST /api/recovery/social - Add trusted contact or process social recovery action
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, contactData, recoveryAttemptId, requiredApprovals } = body;

        if (action === 'add_contact') {
            const { name, email, phone, relationship, emergencyPriority, permissions } = contactData;

            if (!name || !email || !relationship) {
                return NextResponse.json({
                    success: false,
                    error: 'Name, email, and relationship are required'
                }, { status: 400 });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid email format'
                }, { status: 400 });
            }

            const contact = await socialRecoveryService.addTrustedContact({
                name,
                email,
                phone,
                relationship,
                emergencyPriority,
                permissions
            });

            return NextResponse.json({
                success: true,
                data: contact
            }, { status: 201 });

        } else if (action === 'request_approvals') {
            if (!recoveryAttemptId || !requiredApprovals) {
                return NextResponse.json({
                    success: false,
                    error: 'Recovery attempt ID and required approvals count are required'
                }, { status: 400 });
            }

            const approvals = await socialRecoveryService.requestSocialRecoveryApprovals(
                recoveryAttemptId,
                requiredApprovals
            );

            return NextResponse.json({
                success: true,
                data: {
                    message: `Approval requests sent to ${approvals.length} trusted contacts`,
                    approvals
                }
            }, { status: 201 });

        } else {
            return NextResponse.json({
                success: false,
                error: 'Invalid action. Use "add_contact" or "request_approvals"'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error processing social recovery request:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process social recovery request'
        }, { status: 500 });
    }
}