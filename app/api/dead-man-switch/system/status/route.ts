import { NextRequest, NextResponse } from 'next/server';
import { deadManSwitchMonitor } from '../../../../../services/dead-man-switch-monitor';

// GET /api/dead-man-switch/system/status - Get monitoring system status
export async function GET(request: NextRequest) {
    try {
        const status = deadManSwitchMonitor.getStatus();
        const detailedStats = deadManSwitchMonitor.getDetailedStats();
        
        return NextResponse.json({
            success: true,
            data: {
                monitor: status,
                statistics: detailedStats,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching system status:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch system status'
        }, { status: 500 });
    }
}

// POST /api/dead-man-switch/system/status - Control monitoring system
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, config } = body;

        switch (action) {
            case 'start':
                await deadManSwitchMonitor.start();
                break;
            case 'stop':
                await deadManSwitchMonitor.stop();
                break;
            case 'force_check':
                await deadManSwitchMonitor.forceCheck();
                break;
            case 'update_config':
                if (config) {
                    deadManSwitchMonitor.updateConfig(config);
                }
                break;
            default:
                return NextResponse.json({
                    success: false,
                    error: 'Invalid action. Use: start, stop, force_check, or update_config'
                }, { status: 400 });
        }

        const status = deadManSwitchMonitor.getStatus();
        
        return NextResponse.json({
            success: true,
            data: {
                action,
                status,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error controlling monitoring system:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to control monitoring system'
        }, { status: 500 });
    }
}