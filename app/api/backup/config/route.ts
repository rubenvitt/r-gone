import { NextRequest, NextResponse } from 'next/server';
import { backupService, BackupConfig } from '@/services/backup-service';

export async function GET() {
  try {
    const config = await backupService.loadConfig();
    
    return NextResponse.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Failed to get backup config:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get backup configuration' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const config: Partial<BackupConfig> = await request.json();
    
    // Validate config
    if (config.interval !== undefined && config.interval < 5) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backup interval must be at least 5 minutes' 
        },
        { status: 400 }
      );
    }

    if (config.retentionDays !== undefined && config.retentionDays < 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Retention period must be at least 1 day' 
        },
        { status: 400 }
      );
    }

    if (config.maxBackups !== undefined && config.maxBackups < 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Maximum backups must be at least 1' 
        },
        { status: 400 }
      );
    }

    // Load current config and merge with updates
    const currentConfig = await backupService.loadConfig();
    const updatedConfig = { ...currentConfig, ...config };
    
    await backupService.saveConfig(updatedConfig);
    
    // Restart scheduler if config changed
    if (config.enabled !== undefined || config.interval !== undefined) {
      backupService.stopScheduler();
      if (updatedConfig.enabled) {
        await backupService.startScheduler();
      }
    }

    return NextResponse.json({
      success: true,
      config: updatedConfig
    });
  } catch (error) {
    console.error('Failed to update backup config:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update backup configuration' 
      },
      { status: 500 }
    );
  }
}