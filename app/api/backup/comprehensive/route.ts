import { NextRequest, NextResponse } from 'next/server';
import { comprehensiveBackupService } from '../../../../services/comprehensive-backup-service';

// GET /api/backup/comprehensive - Get comprehensive backup statistics
export async function GET(request: NextRequest) {
    try {
        const statistics = await comprehensiveBackupService.getBackupStatistics();
        const configuration = await comprehensiveBackupService.getConfiguration();
        
        return NextResponse.json({
            success: true,
            data: {
                statistics,
                configuration
            }
        });
    } catch (error) {
        console.error('Error fetching backup system data:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch backup system data'
        }, { status: 500 });
    }
}

// POST /api/backup/comprehensive - Trigger comprehensive backup
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, type = 'full', description } = body;

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        const backup = await comprehensiveBackupService.createBackup(
            userId,
            type,
            ['notes', 'passwords', 'documents', 'contacts', 'settings'],
            description || 'Comprehensive system backup'
        );
        
        return NextResponse.json({
            success: true,
            data: backup
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating comprehensive backup:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create comprehensive backup'
        }, { status: 500 });
    }
}