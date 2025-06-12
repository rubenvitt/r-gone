import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
    BackupSystem,
    BackupRecord,
    BackupConfiguration,
    BackupProvider,
    BackupSchedule,
    BackupType,
    BackupStatus,
    BackupEncryption,
    BackupMetadata,
    BackupStorageInfo,
    BackupVerificationResult,
    BackupStatistics,
    BackupVerification,
    EnhancedDecryptedData
} from '../types/data';
import { auditLoggingService } from './audit-logging-service';

class ComprehensiveBackupService {
    private dataPath = path.join(process.cwd(), 'data', 'backups');
    private configPath = path.join(this.dataPath, 'backup-config.json');
    private systemPath = path.join(this.dataPath, 'backup-system.json');
    private schedulerInterval?: NodeJS.Timeout;

    constructor() {
        this.ensureDataDirectoryExists();
        this.initializeScheduler();
    }

    private async ensureDataDirectoryExists(): Promise<void> {
        try {
            await fs.mkdir(this.dataPath, { recursive: true });
            await fs.mkdir(path.join(this.dataPath, 'local'), { recursive: true });
            await fs.mkdir(path.join(this.dataPath, 'temp'), { recursive: true });
            await fs.mkdir(path.join(this.dataPath, 'verification'), { recursive: true });
        } catch (error) {
            console.error('Failed to create backup directories:', error);
        }
    }

    // Initialize backup system
    async initializeBackupSystem(userId: string): Promise<BackupSystem> {
        const defaultConfiguration: BackupConfiguration = {
            globalSettings: {
                enableAutomaticBackups: true,
                enableCrossProviderRedundancy: true,
                enableBackupVerification: true,
                enableCostOptimization: true,
                enableCompression: true,
                enableDeduplication: true,
                maxConcurrentBackups: 3,
                defaultBackupType: 'incremental',
                emergencyBackupThreshold: 100 // MB
            },
            defaultRetention: {
                keepDays: 30,
                keepWeeks: 12,
                keepMonths: 24,
                keepYears: 7,
                maxBackups: 100,
                autoDelete: true,
                archiveOldBackups: true,
                archiveAfterDays: 365
            },
            encryptionDefaults: {
                algorithm: 'AES-256-GCM',
                keyDerivation: 'Argon2',
                iterations: 100000,
                saltSize: 32,
                ivSize: 16,
                separateKeyEncryption: true
            },
            providerFailover: {
                enabled: true,
                failoverDelay: 300, // 5 minutes
                maxRetries: 3,
                fallbackProviders: [],
                requireManualApproval: false,
                notifyOnFailover: true
            },
            costLimits: {
                maxMonthlySpend: 50,
                currency: 'USD',
                alertThresholds: [50, 75, 90],
                pauseBackupsAtLimit: false,
                costOptimizationMode: 'balanced'
            },
            complianceSettings: {
                requireEncryption: true,
                requireGeolocation: false,
                allowedRegions: ['us-east-1', 'eu-west-1'],
                dataResidency: 'flexible',
                retentionCompliance: {
                    legalHold: false,
                    minimumRetentionDays: 7,
                    immutableBackups: false
                },
                auditRequirements: {
                    detailedLogging: true,
                    accessLogging: true,
                    integrityChecking: true,
                    regularComplianceReports: false
                }
            }
        };

        const defaultProviders = await this.createDefaultProviders();
        const defaultSchedules = this.createDefaultSchedules();

        const system: BackupSystem = {
            backups: [],
            configuration: defaultConfiguration,
            providers: defaultProviders,
            schedules: defaultSchedules,
            statistics: this.createEmptyStatistics(),
            verification: {
                enabled: true,
                schedule: {
                    frequency: 'weekly',
                    timeOfDay: '02:00',
                    percentage: 10,
                    priority: 'newest'
                },
                methods: ['checksum', 'partial_restore'],
                results: [],
                statistics: {
                    totalVerifications: 0,
                    passedVerifications: 0,
                    failedVerifications: 0,
                    lastVerificationAt: new Date().toISOString(),
                    averageVerificationTime: 0,
                    integrityScore: 100
                }
            }
        };

        await this.saveBackupSystem(system);
        await this.logBackupEvent('system_initialized', { userId });

        return system;
    }

    // Create backup from current data
    async createBackup(
        userId: string,
        type: BackupType = 'incremental',
        includedData?: string[],
        description?: string
    ): Promise<BackupRecord> {
        const system = await this.getBackupSystem();
        const backupId = uuidv4();

        // Create backup record
        const backup: BackupRecord = {
            id: backupId,
            type,
            status: 'pending',
            createdAt: new Date().toISOString(),
            size: 0,
            checksum: '',
            encryption: system.configuration.encryptionDefaults,
            metadata: {
                originalDataSize: 0,
                compressionRatio: 0,
                dataTypes: includedData || ['notes', 'passwords', 'documents', 'contacts'],
                includedComponents: includedData || [],
                excludedComponents: [],
                retentionPolicy: system.configuration.defaultRetention,
                tags: [type, userId],
                description,
                automaticBackup: false,
                triggeredBy: userId
            },
            storage: []
        };

        try {
            // Update status to in_progress
            backup.status = 'in_progress';
            system.backups.push(backup);
            await this.saveBackupSystem(system);

            // Get data to backup
            const dataToBackup = await this.collectDataForBackup(backup.metadata.dataTypes);
            backup.metadata.originalDataSize = JSON.stringify(dataToBackup).length;

            // Compress data if enabled
            let processedData = dataToBackup;
            if (system.configuration.globalSettings.enableCompression) {
                processedData = await this.compressData(dataToBackup);
                backup.metadata.compressionRatio = 
                    backup.metadata.originalDataSize / JSON.stringify(processedData).length;
            }

            // Encrypt data
            const encryptedData = await this.encryptBackupData(processedData, backup.encryption);
            backup.size = encryptedData.length;
            backup.checksum = this.calculateChecksum(encryptedData);

            // Store backup across providers
            const activeProviders = system.providers.filter(p => p.isActive);
            if (activeProviders.length === 0) {
                throw new Error('No active backup providers configured');
            }

            for (const provider of activeProviders) {
                try {
                    const storageInfo = await this.storeBackupWithProvider(
                        backup,
                        encryptedData,
                        provider
                    );
                    backup.storage.push(storageInfo);
                } catch (error) {
                    console.error(`Failed to store backup with provider ${provider.name}:`, error);
                    // Continue with other providers
                }
            }

            if (backup.storage.length === 0) {
                throw new Error('Failed to store backup with any provider');
            }

            // Complete backup
            backup.status = 'completed';
            backup.completedAt = new Date().toISOString();

            // Schedule verification if enabled
            if (system.verification.enabled) {
                await this.scheduleBackupVerification(backup);
            }

            // Update statistics
            await this.updateBackupStatistics(system, backup);

            await this.saveBackupSystem(system);
            await this.logBackupEvent('backup_created', {
                backupId,
                type,
                size: backup.size,
                providers: backup.storage.length
            });

            return backup;

        } catch (error) {
            backup.status = 'failed';
            await this.saveBackupSystem(system);
            await this.logBackupEvent('backup_failed', {
                backupId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    // Restore backup
    async restoreBackup(
        backupId: string,
        userId: string,
        targetComponents?: string[]
    ): Promise<boolean> {
        const system = await this.getBackupSystem();
        const backup = system.backups.find(b => b.id === backupId);

        if (!backup) {
            throw new Error('Backup not found');
        }

        if (backup.status !== 'completed' && backup.status !== 'verified') {
            throw new Error('Backup is not in a restorable state');
        }

        try {
            // Create restoration record
            backup.restoration = {
                id: uuidv4(),
                requestedAt: new Date().toISOString(),
                requestedBy: userId,
                status: 'in_progress',
                targetLocation: 'primary'
            };

            await this.saveBackupSystem(system);

            // Download backup data from most reliable storage
            const storageInfo = this.selectBestStorage(backup.storage);
            const encryptedData = await this.downloadBackupFromStorage(backup, storageInfo);

            // Verify checksum
            const downloadedChecksum = this.calculateChecksum(encryptedData);
            if (downloadedChecksum !== backup.checksum) {
                throw new Error('Backup integrity check failed - checksum mismatch');
            }

            // Decrypt data
            const decryptedData = await this.decryptBackupData(encryptedData, backup.encryption);

            // Decompress if needed
            const restoredData = backup.metadata.compressionRatio > 1 
                ? await this.decompressData(decryptedData)
                : decryptedData;

            // Apply restoration to specific components
            await this.applyRestoredData(restoredData, targetComponents);

            // Complete restoration
            backup.restoration.status = 'completed';
            backup.restoration.completedAt = new Date().toISOString();
            backup.restoration.restoredSize = JSON.stringify(restoredData).length;
            backup.restoration.verificationPassed = true;

            await this.saveBackupSystem(system);
            await this.logBackupEvent('backup_restored', {
                backupId,
                userId,
                restoredComponents: targetComponents
            });

            return true;

        } catch (error) {
            if (backup.restoration) {
                backup.restoration.status = 'failed';
                backup.restoration.errors = [error instanceof Error ? error.message : 'Unknown error'];
            }
            await this.saveBackupSystem(system);
            await this.logBackupEvent('backup_restore_failed', {
                backupId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    // Schedule automatic backups
    private initializeScheduler(): void {
        // Run scheduler every hour
        this.schedulerInterval = setInterval(async () => {
            await this.runScheduledBackups();
        }, 60 * 60 * 1000);

        // Run initial check after 1 minute
        setTimeout(() => {
            this.runScheduledBackups().catch(console.error);
        }, 60 * 1000);
    }

    private async runScheduledBackups(): Promise<void> {
        try {
            const system = await this.getBackupSystem();
            const now = new Date();

            for (const schedule of system.schedules) {
                if (!schedule.isActive) continue;

                const nextRun = new Date(schedule.nextRunAt);
                if (now >= nextRun) {
                    await this.executeScheduledBackup(schedule);
                }
            }
        } catch (error) {
            console.error('Error running scheduled backups:', error);
        }
    }

    private async executeScheduledBackup(schedule: BackupSchedule): Promise<void> {
        try {
            await this.createBackup(
                'system',
                schedule.backupType,
                schedule.includedData,
                `Scheduled backup: ${schedule.name}`
            );

            schedule.lastRunAt = new Date().toISOString();
            schedule.successCount++;
            
            // Calculate next run time
            schedule.nextRunAt = this.calculateNextRunTime(schedule).toISOString();

            const system = await this.getBackupSystem();
            await this.saveBackupSystem(system);

        } catch (error) {
            schedule.failureCount++;
            await this.logBackupEvent('scheduled_backup_failed', {
                scheduleId: schedule.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Helper methods
    private async collectDataForBackup(dataTypes: string[]): Promise<any> {
        const data: any = {};

        if (dataTypes.includes('notes')) {
            data.notes = await this.getNotesData();
        }

        if (dataTypes.includes('passwords')) {
            data.passwords = await this.getPasswordData();
        }

        if (dataTypes.includes('documents')) {
            data.documents = await this.getDocumentData();
        }

        if (dataTypes.includes('contacts')) {
            data.contacts = await this.getContactData();
        }

        return data;
    }

    private async getNotesData(): Promise<any> {
        // Mock implementation - would integrate with actual file service
        return { notes: [], version: '1.0' };
    }

    private async getPasswordData(): Promise<any> {
        return { entries: [], settings: {} };
    }

    private async getDocumentData(): Promise<any> {
        return { documents: [], metadata: {} };
    }

    private async getContactData(): Promise<any> {
        return { contacts: [], groups: [] };
    }

    private async compressData(data: any): Promise<any> {
        // Implement compression (could use zlib)
        return data; // Mock for now
    }

    private async decompressData(data: any): Promise<any> {
        // Implement decompression
        return data; // Mock for now
    }

    private async encryptBackupData(data: any, encryption: BackupEncryption): Promise<Buffer> {
        const dataString = JSON.stringify(data);
        const buffer = Buffer.from(dataString);
        
        // Use encryption service for actual encryption
        // For now, return mock encrypted data
        return Buffer.from(`encrypted:${buffer.toString('base64')}`);
    }

    private async decryptBackupData(encryptedData: Buffer, encryption: BackupEncryption): Promise<any> {
        // Mock decryption
        const dataString = encryptedData.toString().replace('encrypted:', '');
        const decryptedBuffer = Buffer.from(dataString, 'base64');
        return JSON.parse(decryptedBuffer.toString());
    }

    private calculateChecksum(data: Buffer): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    private async storeBackupWithProvider(
        backup: BackupRecord,
        data: Buffer,
        provider: BackupProvider
    ): Promise<BackupStorageInfo> {
        // Mock storage implementation
        const storageInfo: BackupStorageInfo = {
            provider: provider.id,
            location: {
                type: provider.type === 'cloud' ? 'cloud' : 'local',
                provider: provider.name
            },
            path: `backups/${backup.id}/${Date.now()}.backup`,
            uploadedAt: new Date().toISOString(),
            size: data.length,
            checksum: this.calculateChecksum(data),
            redundancyLevel: 1
        };

        // Actual implementation would upload to the provider
        console.log(`Storing backup ${backup.id} with provider ${provider.name}`);

        return storageInfo;
    }

    private async downloadBackupFromStorage(
        backup: BackupRecord,
        storage: BackupStorageInfo
    ): Promise<Buffer> {
        // Mock download implementation
        console.log(`Downloading backup ${backup.id} from ${storage.provider}`);
        return Buffer.from('mock-backup-data');
    }

    private selectBestStorage(storageInfos: BackupStorageInfo[]): BackupStorageInfo {
        // Select storage with highest redundancy level or most recent
        return storageInfos.reduce((best, current) => 
            current.redundancyLevel > best.redundancyLevel ? current : best
        );
    }

    private async applyRestoredData(data: any, targetComponents?: string[]): Promise<void> {
        // This would apply the restored data to the actual system
        console.log('Applying restored data:', targetComponents || 'all components');
    }

    private async scheduleBackupVerification(backup: BackupRecord): Promise<void> {
        // Schedule verification for later
        console.log(`Scheduling verification for backup ${backup.id}`);
    }

    private async updateBackupStatistics(system: BackupSystem, backup: BackupRecord): Promise<void> {
        system.statistics.totalBackups++;
        system.statistics.totalSize += backup.size;
        
        if (backup.status === 'completed') {
            system.statistics.successfulBackups++;
        } else {
            system.statistics.failedBackups++;
        }

        system.statistics.lastBackupAt = backup.completedAt;
        system.statistics.backupsByType[backup.type] = 
            (system.statistics.backupsByType[backup.type] || 0) + 1;
    }

    private calculateNextRunTime(schedule: BackupSchedule): Date {
        const now = new Date();
        
        if (schedule.frequency.type === 'interval' && schedule.frequency.intervalHours) {
            return new Date(now.getTime() + schedule.frequency.intervalHours * 60 * 60 * 1000);
        }

        // Default to 24 hours
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    private async createDefaultProviders(): Promise<BackupProvider[]> {
        return [
            {
                id: 'local',
                name: 'Local Storage',
                type: 'local',
                isActive: true,
                configuration: {
                    credentials: {},
                    settings: {
                        enableCompression: true,
                        compressionLevel: 6,
                        enableDeduplication: false,
                        maxConcurrentUploads: 1,
                        chunkSize: 1024 * 1024, // 1MB
                        retryAttempts: 3,
                        timeoutSeconds: 300
                    },
                    redundancy: {
                        enabled: false,
                        copies: 1,
                        crossRegion: false,
                        crossProvider: false
                    }
                },
                capabilities: {
                    maxFileSize: 1024 * 1024 * 1024, // 1GB
                    supportedEncryption: ['AES-256-GCM'],
                    supportedCompression: ['gzip'],
                    versioning: true,
                    deduplication: false,
                    crossRegionReplication: false,
                    costOptimization: false,
                    instantRetrieval: true,
                    archiving: false
                },
                statistics: {
                    totalBackups: 0,
                    totalSize: 0,
                    successRate: 100,
                    averageUploadTime: 0,
                    averageDownloadTime: 0,
                    costs: {
                        thisMonth: 0,
                        lastMonth: 0,
                        total: 0
                    }
                },
                costStructure: {
                    storagePerGB: 0,
                    transferPerGB: 0,
                    requestsPer1000: 0,
                    estimatedMonthlyCost: 0,
                    currency: 'USD'
                }
            }
        ];
    }

    private createDefaultSchedules(): BackupSchedule[] {
        return [
            {
                id: uuidv4(),
                name: 'Daily Incremental Backup',
                isActive: true,
                frequency: {
                    type: 'interval',
                    intervalHours: 24
                },
                backupType: 'incremental',
                includedData: ['notes', 'passwords', 'contacts'],
                excludedData: [],
                targetProviders: ['local'],
                maxRetention: {
                    keepDays: 30,
                    keepWeeks: 12,
                    keepMonths: 12,
                    keepYears: 2,
                    maxBackups: 50,
                    autoDelete: true,
                    archiveOldBackups: false,
                    archiveAfterDays: 90
                },
                conditions: [],
                notifications: {
                    onSuccess: false,
                    onFailure: true,
                    onVerificationFail: true,
                    recipients: [],
                    methods: ['email'],
                    includeStatistics: false
                },
                nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                successCount: 0,
                failureCount: 0
            }
        ];
    }

    private createEmptyStatistics(): BackupStatistics {
        return {
            totalBackups: 0,
            totalSize: 0,
            successfulBackups: 0,
            failedBackups: 0,
            averageBackupTime: 0,
            backupsByType: {
                'full': 0,
                'incremental': 0,
                'differential': 0,
                'selective': 0,
                'emergency': 0,
                'paper': 0,
                'hardware': 0,
                'blockchain': 0
            },
            backupsByProvider: {},
            storageDistribution: {},
            costsByProvider: {},
            monthlyGrowth: {
                dataGrowthMB: 0,
                backupCountGrowth: 0,
                costGrowth: 0,
                month: new Date().toISOString().substring(0, 7)
            },
            redundancyStatus: {
                totalBackups: 0,
                singleCopyBackups: 0,
                multiCopyBackups: 0,
                crossProviderBackups: 0,
                offlineBackups: 0,
                averageRedundancy: 1
            }
        };
    }

    // Data persistence
    private async getBackupSystem(): Promise<BackupSystem> {
        try {
            const data = await fs.readFile(this.systemPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return await this.initializeBackupSystem('system');
        }
    }

    private async saveBackupSystem(system: BackupSystem): Promise<void> {
        await fs.writeFile(this.systemPath, JSON.stringify(system, null, 2));
    }

    private async logBackupEvent(eventType: string, details: any): Promise<void> {
        await auditLoggingService.logEvent({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            eventType: 'backup_operation',
            action: `backup_${eventType}`,
            result: 'success',
            details,
            riskLevel: 'low',
            hash: ''
        });
    }

    // Public API methods
    async getBackups(): Promise<BackupRecord[]> {
        const system = await this.getBackupSystem();
        return system.backups;
    }

    async getBackup(backupId: string): Promise<BackupRecord | null> {
        const system = await this.getBackupSystem();
        return system.backups.find(b => b.id === backupId) || null;
    }

    async getBackupStatistics(): Promise<BackupStatistics> {
        const system = await this.getBackupSystem();
        return system.statistics;
    }

    async getConfiguration(): Promise<BackupConfiguration> {
        const system = await this.getBackupSystem();
        return system.configuration;
    }

    // Cleanup on shutdown
    public destroy(): void {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
        }
    }
}

export const comprehensiveBackupService = new ComprehensiveBackupService();