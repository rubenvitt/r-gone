import { NextRequest, NextResponse } from 'next/server';
import { comprehensiveBackupService } from '../../../services/comprehensive-backup-service';
import { BackupType } from '../../../types/data';

// GET /api/backup - Get all backups
export async function GET(request: NextRequest) {
    try {
        const backups = await comprehensiveBackupService.getBackups();
        
        return NextResponse.json({
            success: true,
            data: backups
        });
    } catch (error) {
        console.error('Error fetching backups:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch backups'
        }, { status: 500 });
    }
}

// POST /api/backup - Create a new backup
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, type, includedData, description } = body;

        if (!userId) {
            return NextResponse.json({
                success: false,
                error: 'User ID is required'
            }, { status: 400 });
        }

        const validTypes: BackupType[] = [
            'full', 'incremental', 'differential', 'selective', 
            'emergency', 'paper', 'hardware', 'blockchain'
        ];

        if (type && !validTypes.includes(type)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid backup type'
            }, { status: 400 });
        }

        const backup = await comprehensiveBackupService.createBackup(
            userId,
            type || 'incremental',
            includedData,
            description
        );
        
        return NextResponse.json({
            success: true,
            data: backup
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating backup:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create backup'
        }, { status: 500 });
    }
}