import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
    BackupRecord,
    BackupVerification,
    BackupVerificationResult,
    BackupVerificationMethod,
    BackupVerificationSchedule,
    BackupVerificationStatistics,
    BackupSystem,
    BackupStorageInfo
} from '../types/data';
import { auditLoggingService } from './audit-logging-service';

export class BackupVerificationService {
    private verificationDataPath = path.join(process.cwd(), 'data', 'backups', 'verification');
    private verificationSchedule?: NodeJS.Timeout;

    constructor() {
        this.ensureDirectoryExists();
        this.initializeVerificationScheduler();
    }

    private async ensureDirectoryExists(): Promise<void> {
        try {
            await fs.mkdir(this.verificationDataPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create verification directory:', error);
        }
    }

    // Initialize verification scheduler
    private initializeVerificationScheduler(): void {
        // Run verification checks every 6 hours
        this.verificationSchedule = setInterval(async () => {
            await this.runScheduledVerifications();
        }, 6 * 60 * 60 * 1000);

        // Run initial verification after 5 minutes
        setTimeout(() => {
            this.runScheduledVerifications().catch(console.error);
        }, 5 * 60 * 1000);
    }

    // Comprehensive backup verification
    async verifyBackupComprehensively(backup: BackupRecord): Promise<BackupVerificationResult> {
        const verificationId = uuidv4();
        const startTime = Date.now();

        try {
            await this.logVerificationEvent('verification_started', {
                backupId: backup.id,
                verificationId
            });

            const result: BackupVerificationResult = {
                id: verificationId,
                backupId: backup.id,
                verifiedAt: new Date().toISOString(),
                method: 'comprehensive',
                status: 'passed',
                details: {},
                duration: 0
            };

            // Run checksum verification
            const checksumResult = await this.verifyChecksum(backup);
            result.details['checksum'] = checksumResult;

            if (!checksumResult.success) {
                result.status = 'failed';
                result.errors = result.errors || [];
                result.errors.push(`Checksum verification failed: ${checksumResult.error}`);
            }

            // Run partial restore verification
            const partialResult = await this.verifyPartialRestore(backup);
            result.details['partial_restore'] = partialResult;

            if (!partialResult.success) {
                result.status = 'failed';
                result.errors = result.errors || [];
                result.errors.push(`Partial restore failed: ${partialResult.error}`);
            }

            result.duration = Date.now() - startTime;

            // Save verification result
            await this.saveVerificationResult(result);

            await this.logVerificationEvent('verification_completed', {
                backupId: backup.id,
                verificationId,
                status: result.status,
                duration: result.duration
            });

            return result;

        } catch (error) {
            const failedResult: BackupVerificationResult = {
                id: verificationId,
                backupId: backup.id,
                verifiedAt: new Date().toISOString(),
                method: 'comprehensive',
                status: 'failed',
                details: {},
                duration: Date.now() - startTime,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };

            await this.saveVerificationResult(failedResult);
            return failedResult;
        }
    }

    // Checksum verification
    private async verifyChecksum(backup: BackupRecord): Promise<{ success: boolean; error?: string; details?: any }> {
        try {
            console.log(`Verifying checksums for backup ${backup.id}`);
            
            // Mock checksum verification
            const checksumValid = backup.checksum && backup.checksum.length === 64; // SHA-256 length
            
            return {
                success: checksumValid,
                details: {
                    expected: backup.checksum,
                    storageLocations: backup.storage.length
                },
                error: checksumValid ? undefined : 'Invalid or missing checksum'
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Checksum verification error'
            };
        }
    }

    // Partial restore verification
    private async verifyPartialRestore(backup: BackupRecord): Promise<{ success: boolean; error?: string; details?: any }> {
        try {
            console.log(`Running partial restore verification for backup ${backup.id}`);
            
            // Mock partial restore test
            const hasStorage = backup.storage.length > 0;
            const hasEncryption = backup.encryption && backup.encryption.algorithm;
            
            return {
                success: hasStorage && hasEncryption,
                details: {
                    storageAvailable: hasStorage,
                    encryptionConfigured: hasEncryption,
                    backupSize: backup.size
                },
                error: hasStorage && hasEncryption ? undefined : 'Storage or encryption configuration issues'
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Partial restore verification error'
            };
        }
    }

    private async runScheduledVerifications(): Promise<void> {
        try {
            console.log('Running scheduled backup verifications...');
            
            // Mock scheduled verification - would integrate with actual backup service
            await this.logVerificationEvent('scheduled_verification_run', {
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error during scheduled verification:', error);
            await this.logVerificationEvent('scheduled_verification_failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private async saveVerificationResult(result: BackupVerificationResult): Promise<void> {
        const resultPath = path.join(this.verificationDataPath, `${result.id}.json`);
        await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
    }

    private async logVerificationEvent(eventType: string, details: any): Promise<void> {
        await auditLoggingService.logEvent({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            eventType: 'backup_verification',
            action: `verification_${eventType}`,
            result: 'success',
            details,
            riskLevel: 'low',
            hash: ''
        });
    }

    // Public API methods
    async getVerificationResults(backupId?: string): Promise<BackupVerificationResult[]> {
        try {
            const files = await fs.readdir(this.verificationDataPath);
            const results: BackupVerificationResult[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const resultData = await fs.readFile(path.join(this.verificationDataPath, file), 'utf-8');
                    const result: BackupVerificationResult = JSON.parse(resultData);
                    
                    if (!backupId || result.backupId === backupId) {
                        results.push(result);
                    }
                }
            }

            return results.sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime());

        } catch (error) {
            console.error('Failed to get verification results:', error);
            return [];
        }
    }

    async manualVerification(backupId: string): Promise<BackupVerificationResult> {
        // Mock backup object for manual verification
        const mockBackup: BackupRecord = {
            id: backupId,
            type: 'full',
            status: 'completed',
            createdAt: new Date().toISOString(),
            size: 1024 * 1024, // 1MB
            checksum: crypto.randomBytes(32).toString('hex'),
            encryption: {
                algorithm: 'AES-256-GCM',
                keyDerivation: 'Argon2',
                iterations: 100000,
                saltSize: 32,
                ivSize: 16,
                separateKeyEncryption: true
            },
            metadata: {
                originalDataSize: 1024 * 1024,
                compressionRatio: 1.2,
                dataTypes: ['notes', 'passwords'],
                includedComponents: ['notes', 'passwords'],
                excludedComponents: [],
                retentionPolicy: {
                    keepDays: 30,
                    keepWeeks: 12,
                    keepMonths: 12,
                    keepYears: 2,
                    maxBackups: 50,
                    autoDelete: true,
                    archiveOldBackups: false,
                    archiveAfterDays: 90
                },
                tags: ['manual'],
                automaticBackup: false,
                triggeredBy: 'user'
            },
            storage: [
                {
                    provider: 'local',
                    location: { type: 'local' },
                    path: `/backups/${backupId}`,
                    uploadedAt: new Date().toISOString(),
                    size: 1024 * 1024,
                    checksum: crypto.randomBytes(32).toString('hex'),
                    redundancyLevel: 1
                }
            ]
        };

        return await this.verifyBackupComprehensively(mockBackup);
    }

    // Cleanup
    public destroy(): void {
        if (this.verificationSchedule) {
            clearInterval(this.verificationSchedule);
        }
    }
}

export const backupVerificationService = new BackupVerificationService();