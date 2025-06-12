import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { backupService, BackupEntry, BackupManifest } from './backup-service';
import { fileService } from './file-service';

export interface VerificationResult {
  backupId: string;
  timestamp: string;
  isValid: boolean;
  manifestValid: boolean;
  totalFiles: number;
  validFiles: number;
  corruptedFiles: number;
  missingFiles: number;
  fileChecks: Array<{
    fileId: string;
    filename: string;
    isValid: boolean;
    error?: string;
    checksumMatch?: boolean;
    sizeMatch?: boolean;
    accessible?: boolean;
  }>;
  error?: string;
  verificationDuration: number;
}

export interface SystemIntegrityReport {
  timestamp: string;
  totalBackups: number;
  validBackups: number;
  corruptedBackups: number;
  totalFiles: number;
  corruptedFiles: number;
  recommendations: string[];
  backupResults: VerificationResult[];
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface VerificationSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  autoRepair: boolean;
  notifyOnFailure: boolean;
}

export class BackupVerificationService {
  private configPath: string;
  private reportPath: string;
  private schedulerInterval?: NodeJS.Timeout;
  private defaultSchedule: VerificationSchedule = {
    enabled: true,
    frequency: 'weekly',
    time: '02:00',
    autoRepair: false,
    notifyOnFailure: true
  };

  constructor() {
    this.configPath = path.join(process.cwd(), 'data', 'verification-config.json');
    this.reportPath = path.join(process.cwd(), 'data', 'verification-reports.json');
  }

  /**
   * Perform comprehensive backup verification
   */
  async verifyBackup(backupId: string, options: {
    checkFiles?: boolean;
    validateChecksums?: boolean;
    testRestore?: boolean;
  } = {}): Promise<VerificationResult> {
    const startTime = Date.now();
    
    try {
      const details = await backupService.getBackupDetails(backupId);
      if (!details) {
        return {
          backupId,
          timestamp: new Date().toISOString(),
          isValid: false,
          manifestValid: false,
          totalFiles: 0,
          validFiles: 0,
          corruptedFiles: 0,
          missingFiles: 0,
          fileChecks: [],
          error: 'Backup not found',
          verificationDuration: Date.now() - startTime
        };
      }

      const { entry, manifest } = details;
      const backupPath = path.join(process.cwd(), 'data', 'backups', 'system', backupId);

      // Verify manifest integrity
      const manifestChecksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(manifest))
        .digest('hex');

      const manifestValid = manifestChecksum === entry.checksumHash;

      // Initialize verification result
      const result: VerificationResult = {
        backupId,
        timestamp: new Date().toISOString(),
        isValid: false,
        manifestValid,
        totalFiles: manifest.files.length,
        validFiles: 0,
        corruptedFiles: 0,
        missingFiles: 0,
        fileChecks: [],
        verificationDuration: 0
      };

      // Verify individual files
      if (options.checkFiles !== false) {
        for (const fileInfo of manifest.files) {
          const fileCheck = await this.verifyBackupFile(
            backupPath,
            fileInfo,
            {
              validateChecksum: options.validateChecksums !== false
            }
          );
          
          result.fileChecks.push(fileCheck);
          
          if (fileCheck.isValid) {
            result.validFiles++;
          } else {
            if (!fileCheck.accessible) {
              result.missingFiles++;
            } else {
              result.corruptedFiles++;
            }
          }
        }
      }

      // Test restore functionality if requested
      if (options.testRestore) {
        const testResult = await this.testRestoreCapability(backupId);
        if (!testResult.success) {
          result.error = `Restore test failed: ${testResult.error}`;
        }
      }

      result.isValid = manifestValid && 
                      result.missingFiles === 0 && 
                      result.corruptedFiles === 0 &&
                      (!options.testRestore || !result.error);

      result.verificationDuration = Date.now() - startTime;
      
      return result;

    } catch (error) {
      return {
        backupId,
        timestamp: new Date().toISOString(),
        isValid: false,
        manifestValid: false,
        totalFiles: 0,
        validFiles: 0,
        corruptedFiles: 0,
        missingFiles: 0,
        fileChecks: [],
        error: error instanceof Error ? error.message : 'Verification failed',
        verificationDuration: Date.now() - startTime
      };
    }
  }

  /**
   * Verify individual backup file
   */
  private async verifyBackupFile(
    backupPath: string,
    fileInfo: any,
    options: { validateChecksum?: boolean } = {}
  ): Promise<{
    fileId: string;
    filename: string;
    isValid: boolean;
    error?: string;
    checksumMatch?: boolean;
    sizeMatch?: boolean;
    accessible?: boolean;
  }> {
    const filePath = path.join(backupPath, fileInfo.relativePath);
    
    try {
      // Check if file exists and is accessible
      const stats = await fs.stat(filePath);
      
      const result = {
        fileId: fileInfo.fileId,
        filename: fileInfo.filename,
        isValid: true,
        accessible: true,
        sizeMatch: true,
        checksumMatch: true
      };

      // Verify file size
      if (stats.size !== fileInfo.size) {
        result.sizeMatch = false;
        result.isValid = false;
        result.error = `Size mismatch: expected ${fileInfo.size}, got ${stats.size}`;
      }

      // Verify checksum if requested
      if (options.validateChecksum && fileInfo.checksum) {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const actualChecksum = crypto
          .createHash('sha256')
          .update(fileContent)
          .digest('hex');

        if (actualChecksum !== fileInfo.checksum) {
          result.checksumMatch = false;
          result.isValid = false;
          result.error = result.error 
            ? `${result.error}; Checksum mismatch`
            : 'Checksum mismatch';
        }
      }

      return result;

    } catch (error) {
      return {
        fileId: fileInfo.fileId,
        filename: fileInfo.filename,
        isValid: false,
        accessible: false,
        error: error instanceof Error ? error.message : 'File not accessible'
      };
    }
  }

  /**
   * Test restore capability without actually restoring
   */
  private async testRestoreCapability(backupId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Perform a dry run restore
      const result = await backupService.restoreFromBackup(backupId, {
        dryRun: true,
        restoreToNewIds: true
      });

      if (!result) {
        return { success: false, error: 'Restore test returned null' };
      }

      if (!result.success) {
        return { success: false, error: result.error || 'Restore test failed' };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore test failed'
      };
    }
  }

  /**
   * Verify all backups and generate system integrity report
   */
  async generateSystemIntegrityReport(options: {
    includeFileVerification?: boolean;
    includeRestoreTests?: boolean;
    maxBackupsToCheck?: number;
  } = {}): Promise<SystemIntegrityReport> {
    const startTime = Date.now();
    
    try {
      const backups = await backupService.listBackups({ 
        status: 'completed',
        limit: options.maxBackupsToCheck || 50
      });

      const report: SystemIntegrityReport = {
        timestamp: new Date().toISOString(),
        totalBackups: backups.length,
        validBackups: 0,
        corruptedBackups: 0,
        totalFiles: 0,
        corruptedFiles: 0,
        recommendations: [],
        backupResults: [],
        systemHealth: 'excellent'
      };

      // Verify each backup
      for (const backup of backups) {
        const verificationResult = await this.verifyBackup(backup.id, {
          checkFiles: options.includeFileVerification !== false,
          validateChecksums: options.includeFileVerification !== false,
          testRestore: options.includeRestoreTests === true
        });

        report.backupResults.push(verificationResult);
        report.totalFiles += verificationResult.totalFiles;
        report.corruptedFiles += verificationResult.corruptedFiles;

        if (verificationResult.isValid) {
          report.validBackups++;
        } else {
          report.corruptedBackups++;
        }
      }

      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);
      
      // Determine system health
      report.systemHealth = this.calculateSystemHealth(report);

      // Save report
      await this.saveReport(report);

      return report;

    } catch (error) {
      throw new Error(`Failed to generate integrity report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate recommendations based on verification results
   */
  private generateRecommendations(report: SystemIntegrityReport): string[] {
    const recommendations: string[] = [];

    if (report.corruptedBackups > 0) {
      recommendations.push(`${report.corruptedBackups} backup(s) are corrupted and should be deleted or regenerated`);
    }

    if (report.corruptedFiles > 0) {
      recommendations.push(`${report.corruptedFiles} file(s) across all backups are corrupted`);
    }

    const validBackupRatio = report.totalBackups > 0 ? report.validBackups / report.totalBackups : 1;
    
    if (validBackupRatio < 0.5) {
      recommendations.push('More than 50% of backups are invalid - consider rebuilding your backup system');
    } else if (validBackupRatio < 0.8) {
      recommendations.push('Consider increasing backup frequency to ensure data integrity');
    }

    if (report.totalBackups < 3) {
      recommendations.push('Consider maintaining more backup copies for better redundancy');
    }

    const recentBackups = report.backupResults.filter(b => {
      const backupTime = new Date(b.timestamp).getTime();
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return backupTime > weekAgo;
    });

    if (recentBackups.length === 0) {
      recommendations.push('No backups created in the last week - consider enabling automatic backups');
    }

    if (recommendations.length === 0) {
      recommendations.push('Backup system is healthy - continue current backup practices');
    }

    return recommendations;
  }

  /**
   * Calculate overall system health
   */
  private calculateSystemHealth(report: SystemIntegrityReport): 'excellent' | 'good' | 'warning' | 'critical' {
    if (report.totalBackups === 0) {
      return 'critical';
    }

    const validBackupRatio = report.validBackups / report.totalBackups;
    const corruptedFileRatio = report.totalFiles > 0 ? report.corruptedFiles / report.totalFiles : 0;

    if (validBackupRatio >= 0.95 && corruptedFileRatio < 0.01) {
      return 'excellent';
    } else if (validBackupRatio >= 0.8 && corruptedFileRatio < 0.05) {
      return 'good';
    } else if (validBackupRatio >= 0.5 && corruptedFileRatio < 0.1) {
      return 'warning';
    } else {
      return 'critical';
    }
  }

  /**
   * Save verification report
   */
  private async saveReport(report: SystemIntegrityReport): Promise<void> {
    try {
      let reports: SystemIntegrityReport[] = [];
      
      try {
        const data = await fs.readFile(this.reportPath, 'utf-8');
        reports = JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet
      }

      reports.push(report);
      
      // Keep only last 50 reports
      if (reports.length > 50) {
        reports = reports.slice(-50);
      }

      await fs.writeFile(this.reportPath, JSON.stringify(reports, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save verification report:', error);
    }
  }

  /**
   * Get verification schedule configuration
   */
  async getSchedule(): Promise<VerificationSchedule> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return { ...this.defaultSchedule, ...JSON.parse(data) };
    } catch (error) {
      await this.saveSchedule(this.defaultSchedule);
      return this.defaultSchedule;
    }
  }

  /**
   * Update verification schedule
   */
  async saveSchedule(schedule: VerificationSchedule): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(schedule, null, 2), 'utf-8');
    
    // Restart scheduler with new settings
    this.stopScheduler();
    if (schedule.enabled) {
      await this.startScheduler();
    }
  }

  /**
   * Start scheduled verification
   */
  async startScheduler(): Promise<void> {
    const schedule = await this.getSchedule();
    
    if (!schedule.enabled) {
      return;
    }

    // Calculate next run time
    const nextRun = this.calculateNextRun(schedule);
    const delay = nextRun.getTime() - Date.now();

    if (delay > 0) {
      this.schedulerInterval = setTimeout(async () => {
        try {
          console.log('Starting scheduled backup verification...');
          await this.generateSystemIntegrityReport({
            includeFileVerification: true,
            includeRestoreTests: false
          });
          
          // Schedule next run
          await this.startScheduler();
        } catch (error) {
          console.error('Scheduled verification failed:', error);
        }
      }, delay);

      console.log(`Next backup verification scheduled for: ${nextRun.toISOString()}`);
    }
  }

  /**
   * Stop verification scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearTimeout(this.schedulerInterval);
      this.schedulerInterval = undefined;
    }
  }

  /**
   * Calculate next run time based on schedule
   */
  private calculateNextRun(schedule: VerificationSchedule): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for next occurrence
    if (nextRun <= now) {
      switch (schedule.frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
      }
    }

    return nextRun;
  }

  /**
   * Get verification reports
   */
  async getReports(limit: number = 10): Promise<SystemIntegrityReport[]> {
    try {
      const data = await fs.readFile(this.reportPath, 'utf-8');
      const reports: SystemIntegrityReport[] = JSON.parse(data);
      
      return reports
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete old reports and corrupted backups
   */
  async performMaintenance(): Promise<{
    deletedReports: number;
    deletedBackups: number;
    errors: string[];
  }> {
    const result = {
      deletedReports: 0,
      deletedBackups: 0,
      errors: []
    };

    try {
      // Clean up old reports (keep last 50)
      const reports = await this.getReports(100);
      if (reports.length > 50) {
        const reportsToKeep = reports.slice(0, 50);
        await fs.writeFile(this.reportPath, JSON.stringify(reportsToKeep, null, 2), 'utf-8');
        result.deletedReports = reports.length - 50;
      }

      // Find and optionally delete corrupted backups
      const latestReport = reports[0];
      if (latestReport) {
        const corruptedBackups = latestReport.backupResults.filter(b => !b.isValid);
        
        for (const backup of corruptedBackups) {
          try {
            await backupService.deleteBackup(backup.backupId);
            result.deletedBackups++;
          } catch (error) {
            result.errors.push(`Failed to delete backup ${backup.backupId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

    } catch (error) {
      result.errors.push(`Maintenance failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}

// Singleton instance
export const backupVerificationService = new BackupVerificationService();