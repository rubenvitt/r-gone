import { NextRequest, NextResponse } from 'next/server';
import { emergencyRecoveryService } from '../../../../services/emergency-recovery-service';

// GET /api/recovery/emergency-codes - Get emergency code statistics
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        switch (action) {
            case 'statistics':
                const statistics = await emergencyRecoveryService.getCodeStatistics();
                return NextResponse.json({
                    success: true,
                    data: statistics
                });

            case 'usage-logs':
                const logs = await emergencyRecoveryService.getUsageLogs();
                return NextResponse.json({
                    success: true,
                    data: logs
                });

            case 'printable':
                const printableSheet = await emergencyRecoveryService.generatePrintableCodeSheet();
                return new NextResponse(printableSheet, {
                    headers: {
                        'Content-Type': 'text/html',
                        'Content-Disposition': 'inline; filename="emergency-codes.html"'
                    }
                });

            default:
                const stats = await emergencyRecoveryService.getCodeStatistics();
                return NextResponse.json({
                    success: true,
                    data: stats
                });
        }
    } catch (error) {
        console.error('Error fetching emergency code data:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch emergency code data'
        }, { status: 500 });
    }
}

// POST /api/recovery/emergency-codes - Generate new codes or validate code
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, code, count, codeLength, metadata } = body;

        if (action === 'generate') {
            const codeCount = count || 10;
            const length = codeLength || 12;

            if (codeCount < 1 || codeCount > 50) {
                return NextResponse.json({
                    success: false,
                    error: 'Code count must be between 1 and 50'
                }, { status: 400 });
            }

            if (length < 8 || length > 32) {
                return NextResponse.json({
                    success: false,
                    error: 'Code length must be between 8 and 32 characters'
                }, { status: 400 });
            }

            const codes = await emergencyRecoveryService.generateEmergencyCodes(codeCount, length);
            
            // Return codes without the actual code values for security
            const safeCodes = codes.map(c => ({
                id: c.id,
                purpose: c.purpose,
                isUsed: c.isUsed,
                expiresAt: c.expiresAt,
                createdAt: c.createdAt,
                // Only show first and last 2 characters
                codePreview: c.code.substring(0, 2) + '****' + c.code.substring(c.code.length - 2)
            }));

            return NextResponse.json({
                success: true,
                data: {
                    message: `${codeCount} emergency codes generated successfully`,
                    codes: safeCodes,
                    totalGenerated: codeCount
                }
            }, { status: 201 });

        } else if (action === 'validate') {
            if (!code) {
                return NextResponse.json({
                    success: false,
                    error: 'Emergency code is required for validation'
                }, { status: 400 });
            }

            const validation = await emergencyRecoveryService.validateAndUseCode(code, metadata || {});
            
            return NextResponse.json({
                success: true,
                data: validation
            });

        } else if (action === 'maintenance') {
            const maintenanceResult = await emergencyRecoveryService.performMaintenance();
            
            return NextResponse.json({
                success: true,
                data: maintenanceResult
            });

        } else {
            return NextResponse.json({
                success: false,
                error: 'Invalid action. Use "generate", "validate", or "maintenance"'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error processing emergency code request:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process emergency code request'
        }, { status: 500 });
    }
}

// DELETE /api/recovery/emergency-codes - Revoke codes
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const codeId = searchParams.get('codeId');
        const action = searchParams.get('action');

        if (action === 'revoke-all') {
            const revokedCount = await emergencyRecoveryService.revokeUnusedCodes();
            
            return NextResponse.json({
                success: true,
                data: {
                    message: `${revokedCount} unused codes revoked`,
                    revokedCount
                }
            });

        } else if (codeId) {
            const success = await emergencyRecoveryService.revokeCode(codeId, 'Manual revocation via API');
            
            if (success) {
                return NextResponse.json({
                    success: true,
                    data: {
                        message: 'Emergency code revoked successfully'
                    }
                });
            } else {
                return NextResponse.json({
                    success: false,
                    error: 'Failed to revoke emergency code or code not found'
                }, { status: 404 });
            }

        } else {
            return NextResponse.json({
                success: false,
                error: 'Code ID is required for revocation'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error revoking emergency code:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to revoke emergency code'
        }, { status: 500 });
    }
}