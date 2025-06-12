import { NextRequest, NextResponse } from 'next/server';
import { recoveryService } from '../../../services/recovery-service';
import { RecoveryType } from '../../../types/data';

// GET /api/recovery - Get recovery configuration and statistics
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') as 'config' | 'statistics' | 'mechanisms' | 'attempts';

        switch (type) {
            case 'config':
                const configuration = await recoveryService.getConfiguration();
                return NextResponse.json({
                    success: true,
                    data: configuration
                });

            case 'statistics':
                const statistics = await recoveryService.getRecoveryStatistics();
                return NextResponse.json({
                    success: true,
                    data: statistics
                });

            case 'mechanisms':
                const mechanisms = await recoveryService.getMechanisms();
                return NextResponse.json({
                    success: true,
                    data: mechanisms
                });

            case 'attempts':
                const attempts = await recoveryService.getAttempts();
                return NextResponse.json({
                    success: true,
                    data: attempts
                });

            default:
                // Return overview data
                const [config, stats, mechanismList] = await Promise.all([
                    recoveryService.getConfiguration(),
                    recoveryService.getRecoveryStatistics(),
                    recoveryService.getMechanisms()
                ]);

                return NextResponse.json({
                    success: true,
                    data: {
                        configuration: config,
                        statistics: stats,
                        mechanisms: mechanismList
                    }
                });
        }
    } catch (error) {
        console.error('Error fetching recovery data:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch recovery data'
        }, { status: 500 });
    }
}

// POST /api/recovery - Setup recovery mechanism or initiate recovery
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, type, configuration, initiator, metadata } = body;

        if (action === 'setup') {
            // Setup a new recovery mechanism
            if (!type || !configuration) {
                return NextResponse.json({
                    success: false,
                    error: 'Recovery type and configuration are required for setup'
                }, { status: 400 });
            }

            const validTypes: RecoveryType[] = [
                'master_password_reset',
                'social_recovery',
                'legal_recovery',
                'emergency_codes',
                'hardware_token',
                'biometric',
                'backup_restoration',
                'support_recovery'
            ];

            if (!validTypes.includes(type)) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid recovery type'
                }, { status: 400 });
            }

            const mechanism = await recoveryService.setupRecoveryMechanism(type, configuration);
            
            return NextResponse.json({
                success: true,
                data: mechanism
            }, { status: 201 });

        } else if (action === 'initiate') {
            // Initiate a recovery attempt
            if (!type || !initiator) {
                return NextResponse.json({
                    success: false,
                    error: 'Recovery type and initiator are required for initiation'
                }, { status: 400 });
            }

            const attempt = await recoveryService.initiateRecovery(type, initiator, metadata || {});
            
            return NextResponse.json({
                success: true,
                data: attempt
            }, { status: 201 });

        } else {
            return NextResponse.json({
                success: false,
                error: 'Invalid action. Use "setup" or "initiate"'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error processing recovery request:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process recovery request'
        }, { status: 500 });
    }
}

// PUT /api/recovery - Update recovery configuration
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        
        const updatedConfiguration = await recoveryService.updateConfiguration(body);
        
        return NextResponse.json({
            success: true,
            data: updatedConfiguration
        });
    } catch (error) {
        console.error('Error updating recovery configuration:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update recovery configuration'
        }, { status: 500 });
    }
}