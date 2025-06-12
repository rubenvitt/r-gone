import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileService, FileMetadata } from './file-service';

export interface BackupConfig {
  enabled: boolean;
  interval: number; // in minutes
  retentionDays: number;
  maxBackups: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  cloudBackupEnabled: boolean;
  cloudProvider?: 'aws' | 'gcp' | 'azure';
}

export interface BackupEntry {
  id: string;
  timestamp: string;
  fileCount: number;
  totalSize: number;
  checksumHash: string;
  compressionRatio?: number;
  encrypted: boolean;
  type: 'automatic' | 'manual' | 'before-delete';
  status: 'completed' | 'failed' | 'corrupted';
  error?: string;
  cloudSynced?: boolean;
}

export interface BackupManifest {
  backupId: string;
  timestamp: string;
  files: Array<{
    fileId: string;
    filename: string;
    version: number;
    checksum: string;
    size: number;
    relativePath: string;
  }>;
  metadata: {
    totalFiles: number;
    totalSize: number;
    compressionRatio?: number;
    encrypted: boolean;
  };
}

export interface RestoreResult {
  success: boolean;
  restoredFiles: number;
  failedFiles: number;
  conflicts: Array<{
    fileId: string;
    reason: string;
    resolution: 'skipped' | 'overwritten' | 'renamed';
  }>;
  error?: string;
}

export class BackupService {
  private backupDir: string;
  private configPath: string;
  private logPath: string;
  private schedulerInterval?: NodeJS.Timeout;
  private defaultConfig: BackupConfig = {
    enabled: true,
    interval: 60, // 1 hour
    retentionDays: 30,
    maxBackups: 100,
    compressionEnabled: true,
    encryptionEnabled: true,
    cloudBackupEnabled: false
  };

  constructor() {
    this.backupDir = path.join(process.cwd(), 'data', 'backups', 'system');
    this.configPath = path.join(process.cwd(), 'data', 'backup-config.json');
    this.logPath = path.join(process.cwd(), 'data', 'backup-log.json');
  }

  /**
   * Initialize backup service
   */
  async initialize(): Promise<void> {
    await this.ensureDirectories();
    await this.loadConfig();
    await this.startScheduler();
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  /**
   * Load backup configuration
   */
  async loadConfig(): Promise<BackupConfig> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return { ...this.defaultConfig, ...JSON.parse(data) };
    } catch (error) {
      // Create default config if none exists
      await this.saveConfig(this.defaultConfig);
      return this.defaultConfig;
    }
  }

  /**
   * Save backup configuration
   */
  async saveConfig(config: BackupConfig): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Start automated backup scheduler
   */
  async startScheduler(): Promise<void> {
    const config = await this.loadConfig();
    
    if (!config.enabled) {
      return;
    }

    // Clear existing scheduler
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    // Start new scheduler
    const intervalMs = config.interval * 60 * 1000; // Convert minutes to milliseconds
    
    this.schedulerInterval = setInterval(async () => {
      try {
        await this.createAutomaticBackup();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
        await this.logBackupEvent({
          type: 'error',
          message: `Scheduled backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
      }
    }, intervalMs);

    console.log(`Backup scheduler started with interval: ${config.interval} minutes`);
  }

  /**
   * Stop backup scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = undefined;
      console.log('Backup scheduler stopped');
    }
  }

  /**
   * Create automatic backup
   */
  async createAutomaticBackup(): Promise<BackupEntry> {
    return this.createBackup('automatic');
  }

  /**
   * Create manual backup
   */
  async createManualBackup(): Promise<BackupEntry> {
    return this.createBackup('manual');
  }

  /**
   * Create backup before file deletion
   */
  async createPreDeleteBackup(fileId: string): Promise<BackupEntry> {
    return this.createBackup('before-delete', { specificFileId: fileId });
  }

  /**
   * Core backup creation logic
   */
  private async createBackup(
    type: 'automatic' | 'manual' | 'before-delete',
    options: { specificFileId?: string } = {}
  ): Promise<BackupEntry> {
    const config = await this.loadConfig();
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    try {
      await this.logBackupEvent({
        type: 'start',
        message: `Starting ${type} backup: ${backupId}`,
        timestamp
      });

      // Get files to backup
      let filesToBackup: string[];
      if (options.specificFileId) {
        filesToBackup = [options.specificFileId];
      } else {
        const allFiles = await fileService.listFiles();
        filesToBackup = allFiles.map(f => f.id);
      }

      if (filesToBackup.length === 0) {
        throw new Error('No files to backup');
      }

      // Create backup directory
      const backupPath = path.join(this.backupDir, backupId);
      await fs.mkdir(backupPath, { recursive: true });

      // Create manifest
      const manifest: BackupManifest = {
        backupId,
        timestamp,
        files: [],
        metadata: {
          totalFiles: 0,
          totalSize: 0,
          encrypted: config.encryptionEnabled
        }
      };

      let totalSize = 0;
      const backedUpFiles: Array<{
        fileId: string;
        filename: string;
        version: number;
        checksum: string;
        size: number;
        relativePath: string;
      }> = [];

      // Backup each file
      for (const fileId of filesToBackup) {
        try {
          const [fileData, metadata] = await Promise.all([
            fileService.getEncryptedData(fileId),
            fileService.getFileMetadata(fileId)
          ]);

          if (!fileData) continue;

          const fileName = `${fileId}_v${metadata.version}.encrypted`;
          const filePath = path.join(backupPath, fileName);

          let fileContent = JSON.stringify(fileData);
          
          // Apply compression if enabled
          if (config.compressionEnabled) {
            // For now, we'll use a simple approach. In production, you might want zlib
            // This is a placeholder for compression logic
          }

          // Apply additional encryption if enabled
          if (config.encryptionEnabled) {
            // Additional backup-specific encryption layer
            // This would use a separate backup encryption key
            fileContent = await this.encryptBackupContent(fileContent);
          }

          await fs.writeFile(filePath, fileContent, 'utf-8');

          const fileSize = Buffer.byteLength(fileContent, 'utf-8');
          totalSize += fileSize;

          backedUpFiles.push({
            fileId,
            filename: metadata.filename,
            version: metadata.version,
            checksum: metadata.checksum,
            size: fileSize,
            relativePath: fileName
          });

        } catch (error) {
          console.warn(`Failed to backup file ${fileId}:`, error);
          await this.logBackupEvent({
            type: 'warning',
            message: `Failed to backup file ${fileId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString()
          });
        }
      }

      manifest.files = backedUpFiles;
      manifest.metadata.totalFiles = backedUpFiles.length;
      manifest.metadata.totalSize = totalSize;

      // Save manifest
      const manifestPath = path.join(backupPath, 'manifest.json');
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

      // Create backup entry
      const checksumHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(manifest))
        .digest('hex');

      const backupEntry: BackupEntry = {
        id: backupId,
        timestamp,
        fileCount: backedUpFiles.length,
        totalSize,
        checksumHash,
        encrypted: config.encryptionEnabled,
        type,
        status: 'completed'
      };

      // Save backup entry to log
      await this.addBackupToLog(backupEntry);

      // Clean up old backups
      await this.cleanupOldBackups(config);

      await this.logBackupEvent({
        type: 'complete',
        message: `Backup completed: ${backupId} (${backedUpFiles.length} files, ${this.formatBytes(totalSize)})`,
        timestamp: new Date().toISOString()
      });

      return backupEntry;

    } catch (error) {
      const errorEntry: BackupEntry = {
        id: backupId,
        timestamp,
        fileCount: 0,
        totalSize: 0,
        checksumHash: '',
        encrypted: config.encryptionEnabled,
        type,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      await this.addBackupToLog(errorEntry);
      
      await this.logBackupEvent({
        type: 'error',
        message: `Backup failed: ${backupId} - ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * List all backups
   */
  async listBackups(options: {
    type?: 'automatic' | 'manual' | 'before-delete';
    status?: 'completed' | 'failed' | 'corrupted';
    limit?: number;
    offset?: number;
  } = {}): Promise<BackupEntry[]> {
    try {
      const logData = await fs.readFile(this.logPath, 'utf-8');
      let backups: BackupEntry[] = JSON.parse(logData);

      // Apply filters
      if (options.type) {
        backups = backups.filter(b => b.type === options.type);
      }
      if (options.status) {
        backups = backups.filter(b => b.status === options.status);
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || backups.length;
      
      return backups.slice(offset, offset + limit);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get backup details including manifest
   */
  async getBackupDetails(backupId: string): Promise<{
    entry: BackupEntry;
    manifest: BackupManifest;
  } | null> {
    try {
      const backups = await this.listBackups();
      const entry = backups.find(b => b.id === backupId);
      
      if (!entry) {
        return null;
      }

      const manifestPath = path.join(this.backupDir, backupId, 'manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestData) as BackupManifest;

      return { entry, manifest };
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId: string): Promise<{
    isValid: boolean;
    fileChecks: Array<{
      fileId: string;
      filename: string;
      isValid: boolean;
      error?: string;
    }>;
    manifestValid: boolean;
    error?: string;
  }> {
    try {
      const details = await this.getBackupDetails(backupId);
      if (!details) {
        return {
          isValid: false,
          fileChecks: [],
          manifestValid: false,
          error: 'Backup not found'
        };
      }

      const { entry, manifest } = details;
      const backupPath = path.join(this.backupDir, backupId);

      // Verify manifest integrity
      const manifestChecksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(manifest))
        .digest('hex');

      const manifestValid = manifestChecksum === entry.checksumHash;

      // Verify individual files
      const fileChecks = await Promise.all(
        manifest.files.map(async (file) => {
          try {
            const filePath = path.join(backupPath, file.relativePath);
            await fs.access(filePath);
            
            // Could add more detailed checksum verification here
            return {
              fileId: file.fileId,
              filename: file.filename,
              isValid: true
            };
          } catch (error) {
            return {
              fileId: file.fileId,
              filename: file.filename,
              isValid: false,
              error: error instanceof Error ? error.message : 'File not accessible'
            };
          }
        })
      );

      const allFilesValid = fileChecks.every(check => check.isValid);
      const isValid = manifestValid && allFilesValid;

      return {
        isValid,
        fileChecks,
        manifestValid
      };
    } catch (error) {
      return {
        isValid: false,
        fileChecks: [],
        manifestValid: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backupPath = path.join(this.backupDir, backupId);
      
      // Remove directory and all contents
      await fs.rm(backupPath, { recursive: true, force: true });

      // Remove from log
      await this.removeBackupFromLog(backupId);

      await this.logBackupEvent({
        type: 'delete',
        message: `Backup deleted: ${backupId}`,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
      return false;
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(config: BackupConfig): Promise<void> {
    try {
      const backups = await this.listBackups({ status: 'completed' });
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

      // Find backups to delete (older than retention period or exceeding max count)
      const backupsToDelete = backups.filter((backup, index) => {
        const backupDate = new Date(backup.timestamp);
        return backupDate < cutoffDate || index >= config.maxBackups;
      });

      for (const backup of backupsToDelete) {
        await this.deleteBackup(backup.id);
      }

      if (backupsToDelete.length > 0) {
        await this.logBackupEvent({
          type: 'cleanup',
          message: `Cleaned up ${backupsToDelete.length} old backups`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Add backup entry to log
   */
  private async addBackupToLog(entry: BackupEntry): Promise<void> {
    try {
      let backups: BackupEntry[] = [];
      
      try {
        const data = await fs.readFile(this.logPath, 'utf-8');
        backups = JSON.parse(data);
      } catch (error) {
        // Log file doesn't exist yet
      }

      backups.push(entry);
      await fs.writeFile(this.logPath, JSON.stringify(backups, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to add backup to log:', error);
    }
  }

  /**
   * Remove backup entry from log
   */
  private async removeBackupFromLog(backupId: string): Promise<void> {
    try {
      const data = await fs.readFile(this.logPath, 'utf-8');
      let backups: BackupEntry[] = JSON.parse(data);
      
      backups = backups.filter(b => b.id !== backupId);
      await fs.writeFile(this.logPath, JSON.stringify(backups, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to remove backup from log:', error);
    }
  }

  /**
   * Log backup events
   */
  private async logBackupEvent(event: {
    type: 'start' | 'complete' | 'error' | 'warning' | 'cleanup' | 'delete';
    message: string;
    timestamp: string;
  }): Promise<void> {
    console.log(`[Backup ${event.type.toUpperCase()}] ${event.message}`);
    // In production, you might want to store these events separately
  }

  /**
   * Encrypt backup content with backup-specific key
   */
  private async encryptBackupContent(content: string): Promise<string> {
    // This is a placeholder for backup-specific encryption
    // In production, you would use a separate backup encryption key
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      algorithm: 'aes-256-cbc'
    });
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Export data as downloadable archive
   */
  async createExportArchive(options: {
    fileIds?: string[];
    includeMetadata?: boolean;
    format?: 'zip' | 'tar';
    password?: string;
  } = {}): Promise<{
    success: boolean;
    exportId: string;
    filePath?: string;
    error?: string;
  }> {
    try {
      const exportId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const exportDir = path.join(this.backupDir, 'exports', exportId);
      
      await fs.mkdir(exportDir, { recursive: true });

      // Get files to export
      let filesToExport: string[];
      if (options.fileIds && options.fileIds.length > 0) {
        filesToExport = options.fileIds;
      } else {
        const allFiles = await fileService.listFiles();
        filesToExport = allFiles.map(f => f.id);
      }

      if (filesToExport.length === 0) {
        return {
          success: false,
          exportId,
          error: 'No files to export'
        };
      }

      // Create export manifest
      const exportManifest = {
        exportId,
        timestamp,
        version: '1.0',
        type: 'manual-export',
        files: [],
        metadata: {
          totalFiles: 0,
          exportedBy: 'if-im-gone-backup-system',
          includesMetadata: options.includeMetadata || false
        }
      };

      const exportedFiles = [];

      // Export each file
      for (const fileId of filesToExport) {
        try {
          const [fileData, metadata] = await Promise.all([
            fileService.getEncryptedData(fileId),
            fileService.getFileMetadata(fileId)
          ]);

          if (!fileData) continue;

          // Save file data
          const fileName = `${fileId}.encrypted`;
          const filePath = path.join(exportDir, fileName);
          await fs.writeFile(filePath, JSON.stringify(fileData), 'utf-8');

          // Save metadata if requested
          if (options.includeMetadata) {
            const metadataFileName = `${fileId}.meta.json`;
            const metadataPath = path.join(exportDir, metadataFileName);
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
          }

          exportedFiles.push({
            fileId,
            filename: metadata.filename,
            version: metadata.version,
            size: Buffer.byteLength(JSON.stringify(fileData), 'utf-8'),
            checksum: metadata.checksum,
            exportPath: fileName,
            metadataPath: options.includeMetadata ? `${fileId}.meta.json` : undefined
          });

        } catch (error) {
          console.warn(`Failed to export file ${fileId}:`, error);
        }
      }

      exportManifest.files = exportedFiles;
      exportManifest.metadata.totalFiles = exportedFiles.length;

      // Save export manifest
      const manifestPath = path.join(exportDir, 'export-manifest.json');
      await fs.writeFile(manifestPath, JSON.stringify(exportManifest, null, 2), 'utf-8');

      // Create README for the export
      const readmePath = path.join(exportDir, 'README.txt');
      const readmeContent = `If I'm Gone - Data Export
========================

Export ID: ${exportId}
Created: ${timestamp}
Files: ${exportedFiles.length}

This archive contains encrypted data from the "If I'm Gone" emergency information system.

Files included:
- export-manifest.json: Information about this export
- *.encrypted: Encrypted data files
${options.includeMetadata ? '- *.meta.json: File metadata (timestamps, versions, etc.)' : ''}

To restore this data:
1. Use the "Import/Restore" feature in the If I'm Gone application
2. Select this entire folder or zip it first
3. Follow the application's restore wizard

IMPORTANT: Keep this export secure and backed up in multiple locations.
`;
      
      await fs.writeFile(readmePath, readmeContent, 'utf-8');

      return {
        success: true,
        exportId,
        filePath: exportDir
      };

    } catch (error) {
      console.error('Export creation failed:', error);
      return {
        success: false,
        exportId: '',
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Import data from archive
   */
  async importFromArchive(
    archivePath: string,
    options: {
      overwriteExisting?: boolean;
      skipOnConflict?: boolean;
      validateIntegrity?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<RestoreResult> {
    try {
      // Validate archive path exists
      await fs.access(archivePath);

      // Look for manifest file
      const manifestPath = path.join(archivePath, 'export-manifest.json');
      
      let manifest;
      try {
        const manifestData = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestData);
      } catch (error) {
        return {
          success: false,
          restoredFiles: 0,
          failedFiles: 0,
          conflicts: [],
          error: 'Invalid archive: missing or corrupted manifest file'
        };
      }

      const conflicts = [];
      let restoredFiles = 0;
      let failedFiles = 0;

      // Process each file in the manifest
      for (const fileInfo of manifest.files) {
        try {
          const fileId = fileInfo.fileId;
          const sourceFilePath = path.join(archivePath, fileInfo.exportPath);
          
          // Check if file exists in current system
          let existingMetadata;
          try {
            existingMetadata = await fileService.getFileMetadata(fileId);
          } catch (error) {
            // File doesn't exist, safe to import
          }

          if (existingMetadata) {
            if (!options.overwriteExisting) {
              if (options.skipOnConflict) {
                conflicts.push({
                  fileId,
                  reason: 'File exists, skipped due to settings',
                  resolution: 'skipped'
                });
                continue;
              } else {
                // Create conflict resolution
                conflicts.push({
                  fileId,
                  reason: 'File exists in system',
                  resolution: 'overwritten'
                });
              }
            }
          }

          if (options.dryRun) {
            restoredFiles++;
            continue;
          }

          // Read file data from archive
          const fileData = await fs.readFile(sourceFilePath, 'utf-8');
          const parsedFileData = JSON.parse(fileData);

          // Validate integrity if requested
          if (options.validateIntegrity && fileInfo.checksum) {
            const actualChecksum = crypto
              .createHash('sha256')
              .update(parsedFileData.encryptedContent)
              .digest('hex');
            
            if (actualChecksum !== fileInfo.checksum) {
              failedFiles++;
              conflicts.push({
                fileId,
                reason: 'Integrity check failed',
                resolution: 'skipped'
              });
              continue;
            }
          }

          // Import metadata if available
          let importedMetadata;
          if (fileInfo.metadataPath) {
            try {
              const metadataPath = path.join(archivePath, fileInfo.metadataPath);
              const metadataContent = await fs.readFile(metadataPath, 'utf-8');
              importedMetadata = JSON.parse(metadataContent);
            } catch (error) {
              console.warn(`Failed to read metadata for ${fileId}:`, error);
            }
          }

          // Save the file using file service
          const saveResult = await fileService.saveEncryptedData(
            parsedFileData.encryptedContent,
            {
              fileId,
              filename: importedMetadata?.filename || fileInfo.filename,
              description: importedMetadata?.description,
              tags: importedMetadata?.tags
            }
          );

          if (saveResult.success) {
            restoredFiles++;
          } else {
            failedFiles++;
            conflicts.push({
              fileId,
              reason: saveResult.error || 'Failed to save file',
              resolution: 'skipped'
            });
          }

        } catch (error) {
          failedFiles++;
          conflicts.push({
            fileId: fileInfo.fileId,
            reason: error instanceof Error ? error.message : 'Unknown error',
            resolution: 'skipped'
          });
        }
      }

      return {
        success: failedFiles === 0 || restoredFiles > 0,
        restoredFiles,
        failedFiles,
        conflicts
      };

    } catch (error) {
      return {
        success: false,
        restoredFiles: 0,
        failedFiles: 0,
        conflicts: [],
        error: error instanceof Error ? error.message : 'Import failed'
      };
    }
  }

  /**
   * Restore from a specific backup
   */
  async restoreFromBackup(
    backupId: string,
    options: {
      fileIds?: string[];
      overwriteExisting?: boolean;
      restoreToNewIds?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<RestoreResult> {
    try {
      const details = await this.getBackupDetails(backupId);
      if (!details) {
        return {
          success: false,
          restoredFiles: 0,
          failedFiles: 0,
          conflicts: [],
          error: 'Backup not found'
        };
      }

      const { manifest } = details;
      const backupPath = path.join(this.backupDir, backupId);

      // Filter files if specific IDs requested
      let filesToRestore = manifest.files;
      if (options.fileIds && options.fileIds.length > 0) {
        filesToRestore = manifest.files.filter(f => options.fileIds!.includes(f.fileId));
      }

      const conflicts = [];
      let restoredFiles = 0;
      let failedFiles = 0;

      for (const fileInfo of filesToRestore) {
        try {
          const sourceFilePath = path.join(backupPath, fileInfo.relativePath);
          
          // Generate new ID if requested
          const targetFileId = options.restoreToNewIds ? crypto.randomUUID() : fileInfo.fileId;
          
          // Check for conflicts
          if (!options.restoreToNewIds) {
            try {
              const existingMetadata = await fileService.getFileMetadata(fileInfo.fileId);
              if (existingMetadata && !options.overwriteExisting) {
                conflicts.push({
                  fileId: fileInfo.fileId,
                  reason: 'File exists, overwrite not enabled',
                  resolution: 'skipped'
                });
                continue;
              }
            } catch (error) {
              // File doesn't exist, safe to restore
            }
          }

          if (options.dryRun) {
            restoredFiles++;
            continue;
          }

          // Read and decrypt backup file content
          let fileContent = await fs.readFile(sourceFilePath, 'utf-8');
          
          // If backup was encrypted, decrypt it
          if (manifest.metadata.encrypted) {
            // This would need backup-specific decryption
            // For now, assume content is already in the correct format
          }

          const fileData = JSON.parse(fileContent);

          // Save the restored file
          const saveResult = await fileService.saveEncryptedData(
            fileData.encryptedContent,
            {
              fileId: targetFileId,
              filename: fileInfo.filename,
              description: `Restored from backup ${backupId}`
            }
          );

          if (saveResult.success) {
            restoredFiles++;
            if (options.restoreToNewIds) {
              conflicts.push({
                fileId: fileInfo.fileId,
                reason: `Restored as new file: ${targetFileId}`,
                resolution: 'renamed'
              });
            }
          } else {
            failedFiles++;
            conflicts.push({
              fileId: fileInfo.fileId,
              reason: saveResult.error || 'Failed to save restored file',
              resolution: 'skipped'
            });
          }

        } catch (error) {
          failedFiles++;
          conflicts.push({
            fileId: fileInfo.fileId,
            reason: error instanceof Error ? error.message : 'Restore failed',
            resolution: 'skipped'
          });
        }
      }

      return {
        success: failedFiles === 0 || restoredFiles > 0,
        restoredFiles,
        failedFiles,
        conflicts
      };

    } catch (error) {
      return {
        success: false,
        restoredFiles: 0,
        failedFiles: 0,
        conflicts: [],
        error: error instanceof Error ? error.message : 'Restore operation failed'
      };
    }
  }

  /**
   * List available exports
   */
  async listExports(): Promise<Array<{
    exportId: string;
    timestamp: string;
    fileCount: number;
    size: number;
    path: string;
  }>> {
    try {
      const exportsDir = path.join(this.backupDir, 'exports');
      
      try {
        await fs.access(exportsDir);
      } catch (error) {
        return [];
      }

      const exportDirs = await fs.readdir(exportsDir);
      const exports = [];

      for (const exportDir of exportDirs) {
        try {
          const exportPath = path.join(exportsDir, exportDir);
          const manifestPath = path.join(exportPath, 'export-manifest.json');
          
          const manifestData = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestData);

          // Get directory size
          const stats = await this.getDirectorySize(exportPath);

          exports.push({
            exportId: manifest.exportId,
            timestamp: manifest.timestamp,
            fileCount: manifest.metadata.totalFiles,
            size: stats.size,
            path: exportPath
          });

        } catch (error) {
          console.warn(`Failed to read export ${exportDir}:`, error);
        }
      }

      return exports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    } catch (error) {
      console.error('Failed to list exports:', error);
      return [];
    }
  }

  /**
   * Delete export
   */
  async deleteExport(exportId: string): Promise<boolean> {
    try {
      const exportPath = path.join(this.backupDir, 'exports', exportId);
      await fs.rm(exportPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      console.error(`Failed to delete export ${exportId}:`, error);
      return false;
    }
  }

  /**
   * Get directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<{ size: number; files: number }> {
    let totalSize = 0;
    let fileCount = 0;

    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          const subDirStats = await this.getDirectorySize(itemPath);
          totalSize += subDirStats.size;
          fileCount += subDirStats.files;
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      }
    } catch (error) {
      console.warn(`Failed to get size for ${dirPath}:`, error);
    }

    return { size: totalSize, files: fileCount };
  }

  /**
   * Get backup service statistics
   */
  async getStats(): Promise<{
    totalBackups: number;
    completedBackups: number;
    failedBackups: number;
    totalBackupSize: number;
    oldestBackup?: string;
    newestBackup?: string;
    schedulerEnabled: boolean;
    nextScheduledBackup?: string;
  }> {
    try {
      const backups = await this.listBackups();
      const config = await this.loadConfig();
      
      const totalBackups = backups.length;
      const completedBackups = backups.filter(b => b.status === 'completed').length;
      const failedBackups = backups.filter(b => b.status === 'failed').length;
      const totalBackupSize = backups
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + b.totalSize, 0);

      const sortedByDate = [...backups].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      let nextScheduledBackup: string | undefined;
      if (config.enabled && this.schedulerInterval) {
        const lastBackup = backups
          .filter(b => b.type === 'automatic')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        if (lastBackup) {
          const nextTime = new Date(lastBackup.timestamp);
          nextTime.setMinutes(nextTime.getMinutes() + config.interval);
          nextScheduledBackup = nextTime.toISOString();
        }
      }

      return {
        totalBackups,
        completedBackups,
        failedBackups,
        totalBackupSize,
        oldestBackup: sortedByDate[0]?.timestamp,
        newestBackup: sortedByDate[sortedByDate.length - 1]?.timestamp,
        schedulerEnabled: config.enabled,
        nextScheduledBackup
      };
    } catch (error) {
      console.error('Failed to get backup stats:', error);
      throw error;
    }
  }
}

// Singleton instance
export const backupService = new BackupService();