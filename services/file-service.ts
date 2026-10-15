import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid'
import path from 'path';
import crypto from 'crypto';
import { EncryptedDataFile } from '@/types/data';

export interface FileMetadata {
    id: string;
    filename: string;
    size: number;
    checksum: string;
    createdAt: string;
    updatedAt: string;
    version: number;
    description?: string;
    tags?: string[];
}

export interface FileListItem {
    id: string;
    filename: string;
    size: number;
    createdAt: string;
    updatedAt: string;
    version: number;
    description?: string;
    tags?: string[];
}

export interface SaveResult {
    success: boolean;
    fileId?: string;
    version?: number;
    error?: string;
}

export interface FileServiceError extends Error {
    code: string;
    statusCode: number;
}

export class FileServiceError extends Error {
    constructor(message: string, public code: string, public statusCode: number) {
        super(message);
        this.name = 'FileServiceError';
    }
}

export class FileService {
    private dataDir: string;
    private metadataDir: string;
    private backupDir: string;

    constructor() {
        this.dataDir = path.join(process.cwd(), 'data');
        this.metadataDir = path.join(process.cwd(), 'data', 'metadata');
        this.backupDir = path.join(process.cwd(), 'data', 'backups');
    }

    /**
     * Get user-specific directory paths
     */
    private getUserDataDir(userId: string): string {
        return path.join(this.dataDir, 'users', userId);
    }

    private getUserMetadataDir(userId: string): string {
        return path.join(this.metadataDir, 'users', userId);
    }

    private getUserBackupDir(userId: string): string {
        return path.join(this.backupDir, 'users', userId);
    }

    private async ensureDirectories(userId?: string): Promise<void> {
        const dirs = [
            fs.mkdir(this.dataDir, { recursive: true }),
            fs.mkdir(this.metadataDir, { recursive: true }),
            fs.mkdir(this.backupDir, { recursive: true })
        ];

        if (userId) {
            dirs.push(
                fs.mkdir(this.getUserDataDir(userId), { recursive: true }),
                fs.mkdir(this.getUserMetadataDir(userId), { recursive: true }),
                fs.mkdir(this.getUserBackupDir(userId), { recursive: true })
            );
        }

        await Promise.all(dirs);
    }

    private getFilePath(fileId: string, userId: string): string {
        return path.join(this.getUserDataDir(userId), `${fileId}.encrypted`);
    }

    private getMetadataPath(fileId: string, userId: string): string {
        return path.join(this.getUserMetadataDir(userId), `${fileId}.meta.json`);
    }

    private getBackupPath(fileId: string, version: number, userId: string): string {
        return path.join(this.getUserBackupDir(userId), `${fileId}_v${version}.encrypted`);
    }

    private generateChecksum(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    private generateFileId(): string {
        return uuidv4();
    }

    /**
     * Save encrypted data with metadata and versioning
     */
    async saveEncryptedData(
        encryptedContent: string,
        userId: string,
        options: {
            fileId?: string;
            filename?: string;
            description?: string;
            tags?: string[];
        } = {}
    ): Promise<SaveResult> {
        try {
            await this.ensureDirectories(userId);

            const fileId = options.fileId || this.generateFileId();
            const filename = options.filename || `emergency-info-${new Date().toISOString().split('T')[0]}`;
            const checksum = this.generateChecksum(encryptedContent);
            const now = new Date().toISOString();

            // Check if file exists to determine version
            let version = 1;
            let existingMetadata: FileMetadata | null = null;
            
            try {
                existingMetadata = await this.getFileMetadata(fileId, userId);
                version = existingMetadata.version + 1;
                
                // Create backup of previous version
                await this.createBackup(fileId, existingMetadata.version, userId);
            } catch (error) {
                // File doesn't exist, this is a new file
            }

            // Create file data structure
            const fileData: EncryptedDataFile = {
                encryptedContent,
                iv: '', // Will be set by encryption service if needed
                createdAt: existingMetadata?.createdAt || now,
                updatedAt: now
            };

            // Create metadata
            const metadata: FileMetadata = {
                id: fileId,
                filename,
                size: encryptedContent.length,
                checksum,
                createdAt: existingMetadata?.createdAt || now,
                updatedAt: now,
                version,
                description: options.description,
                tags: options.tags || []
            };

            // Save file and metadata atomically
            const filePath = this.getFilePath(fileId, userId);
            const metadataPath = this.getMetadataPath(fileId, userId);

            await Promise.all([
                fs.writeFile(filePath, JSON.stringify(fileData), 'utf-8'),
                fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
            ]);

            return {
                success: true,
                fileId,
                version
            };
        } catch (error) {
            console.error('Save operation failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Save operation failed'
            };
        }
    }

    /**
     * Get encrypted data by file ID
     */
    async getEncryptedData(fileId: string, userId: string): Promise<EncryptedDataFile | null> {
        try {
            const filePath = this.getFilePath(fileId, userId);
            const data = await fs.readFile(filePath, 'utf-8');
            const parsedData = JSON.parse(data) as EncryptedDataFile;
            
            // Verify checksum if metadata exists
            try {
                const metadata = await this.getFileMetadata(fileId, userId);
                const currentChecksum = this.generateChecksum(parsedData.encryptedContent);
                
                if (currentChecksum !== metadata.checksum) {
                    throw new FileServiceError(
                        'File integrity check failed - data may be corrupted',
                        'INTEGRITY_CHECK_FAILED',
                        500
                    );
                }
            } catch (metadataError) {
                // If metadata doesn't exist, continue without checksum verification
                console.warn('No metadata found for integrity check:', fileId);
            }
            
            return parsedData;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get file metadata
     */
    async getFileMetadata(fileId: string, userId: string): Promise<FileMetadata> {
        try {
            const metadataPath = this.getMetadataPath(fileId, userId);
            const data = await fs.readFile(metadataPath, 'utf-8');
            return JSON.parse(data) as FileMetadata;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new FileServiceError(
                    'File metadata not found',
                    'METADATA_NOT_FOUND',
                    404
                );
            }
            throw error;
        }
    }

    /**
     * List all available files for a user
     */
    async listFiles(userId: string, options: {
        sortBy?: 'createdAt' | 'updatedAt' | 'filename' | 'size';
        sortOrder?: 'asc' | 'desc';
        tags?: string[];
        search?: string;
    } = {}): Promise<FileListItem[]> {
        try {
            await this.ensureDirectories(userId);
            
            const userMetadataDir = this.getUserMetadataDir(userId);
            const metadataFiles = await fs.readdir(userMetadataDir).catch(() => []);
            const metadataPromises = metadataFiles
                .filter(file => file.endsWith('.meta.json'))
                .map(async file => {
                    try {
                        const filePath = path.join(userMetadataDir, file);
                        const data = await fs.readFile(filePath, 'utf-8');
                        return JSON.parse(data) as FileMetadata;
                    } catch (error) {
                        console.warn(`Failed to read metadata file ${file}:`, error);
                        return null;
                    }
                });

            let files = (await Promise.all(metadataPromises))
                .filter((metadata): metadata is FileMetadata => metadata !== null);

            // Apply filters
            if (options.tags && options.tags.length > 0) {
                files = files.filter(file => 
                    options.tags!.some(tag => file.tags?.includes(tag))
                );
            }

            if (options.search) {
                const searchLower = options.search.toLowerCase();
                files = files.filter(file =>
                    file.filename.toLowerCase().includes(searchLower) ||
                    file.description?.toLowerCase().includes(searchLower) ||
                    file.tags?.some(tag => tag.toLowerCase().includes(searchLower))
                );
            }

            // Apply sorting
            const sortBy = options.sortBy || 'updatedAt';
            const sortOrder = options.sortOrder || 'desc';
            
            files.sort((a, b) => {
                let aValue = a[sortBy as keyof FileMetadata];
                let bValue = b[sortBy as keyof FileMetadata];
                
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }
                
                if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            // Convert to list items (excluding sensitive metadata)
            return files.map(file => ({
                id: file.id,
                filename: file.filename,
                size: file.size,
                createdAt: file.createdAt,
                updatedAt: file.updatedAt,
                version: file.version,
                description: file.description,
                tags: file.tags
            }));
        } catch (error) {
            console.error('Failed to list files:', error);
            throw new FileServiceError(
                'Failed to list files',
                'LIST_FAILED',
                500
            );
        }
    }

    /**
     * Delete a file and its metadata
     */
    async deleteFile(fileId: string, userId: string): Promise<boolean> {
        try {
            const filePath = this.getFilePath(fileId, userId);
            const metadataPath = this.getMetadataPath(fileId, userId);

            // Check if file exists
            try {
                await fs.access(filePath);
            } catch (error) {
                throw new FileServiceError(
                    'File not found',
                    'FILE_NOT_FOUND',
                    404
                );
            }

            // Create final backup before deletion
            try {
                const metadata = await this.getFileMetadata(fileId, userId);
                await this.createBackup(fileId, metadata.version, userId, true);
            } catch (error) {
                console.warn('Failed to create backup before deletion:', error);
            }

            // Delete file and metadata
            await Promise.all([
                fs.unlink(filePath).catch(() => {}), // Ignore errors
                fs.unlink(metadataPath).catch(() => {}) // Ignore errors
            ]);

            return true;
        } catch (error) {
            if (error instanceof FileServiceError) {
                throw error;
            }
            console.error('Delete operation failed:', error);
            throw new FileServiceError(
                'Delete operation failed',
                'DELETE_FAILED',
                500
            );
        }
    }

    /**
     * Create backup of file
     */
    async createBackup(fileId: string, version: number, userId: string, isDeleted = false): Promise<void> {
        try {
            const filePath = this.getFilePath(fileId, userId);
            const backupPath = this.getBackupPath(fileId, version, userId);
            
            // Create backup with timestamp suffix if it's a deletion backup
            const finalBackupPath = isDeleted 
                ? backupPath.replace('.encrypted', `_deleted_${Date.now()}.encrypted`)
                : backupPath;

            await fs.copyFile(filePath, finalBackupPath);
        } catch (error) {
            console.warn(`Failed to create backup for ${fileId} v${version}:`, error);
            // Don't throw - backup failure shouldn't prevent save operation
        }
    }

    /**
     * Restore backup of file
     */
    async restoreBackup(fileId: string, version: number, userId: string): Promise<boolean> {
        try {
            const backupPath = this.getBackupPath(fileId, version, userId);
            const filePath = this.getFilePath(fileId, userId);
            
            // Check if backup exists
            try {
                await fs.access(backupPath);
            } catch (error) {
                throw new FileServiceError(
                    'Backup not found',
                    'BACKUP_NOT_FOUND',
                    404
                );
            }

            // Restore the backup
            await fs.copyFile(backupPath, filePath);
            
            // Update metadata to reflect the restored version
            try {
                const metadata = await this.getFileMetadata(fileId, userId);
                metadata.version = version;
                metadata.updatedAt = new Date().toISOString();
                
                const metadataPath = this.getMetadataPath(fileId, userId);
                await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
            } catch (error) {
                console.warn('Failed to update metadata after restore:', error);
            }
            
            return true;
        } catch (error) {
            if (error instanceof FileServiceError) {
                throw error;
            }
            console.error('Restore operation failed:', error);
            throw new FileServiceError(
                'Restore operation failed',
                'RESTORE_FAILED',
                500
            );
        }
    }

    /**
     * Verify file integrity
     */
    async verifyFileIntegrity(fileId: string, userId: string): Promise<{
        isValid: boolean;
        expectedChecksum?: string;
        actualChecksum?: string;
        error?: string;
    }> {
        try {
            const [fileData, metadata] = await Promise.all([
                this.getEncryptedData(fileId, userId),
                this.getFileMetadata(fileId, userId)
            ]);

            if (!fileData) {
                return { isValid: false, error: 'File not found' };
            }

            const actualChecksum = this.generateChecksum(fileData.encryptedContent);
            const expectedChecksum = metadata.checksum;

            return {
                isValid: actualChecksum === expectedChecksum,
                expectedChecksum,
                actualChecksum
            };
        } catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Verification failed'
            };
        }
    }

    /**
     * Update file metadata
     */
    async updateMetadata(fileId: string, userId: string, updates: {
        filename?: string;
        description?: string;
        tags?: string[];
    }): Promise<boolean> {
        try {
            const metadata = await this.getFileMetadata(fileId, userId);
            
            // Update fields
            if (updates.filename !== undefined) metadata.filename = updates.filename;
            if (updates.description !== undefined) metadata.description = updates.description;
            if (updates.tags !== undefined) metadata.tags = updates.tags;
            
            metadata.updatedAt = new Date().toISOString();
            
            // Save updated metadata
            const metadataPath = this.getMetadataPath(fileId, userId);
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
            
            return true;
        } catch (error) {
            if (error instanceof FileServiceError) {
                throw error;
            }
            console.error('Update metadata failed:', error);
            throw new FileServiceError(
                'Failed to update metadata',
                'UPDATE_METADATA_FAILED',
                500
            );
        }
    }

    /**
     * Get storage statistics for a user
     */
    async getStorageStats(userId: string): Promise<{
        totalFiles: number;
        totalSize: number;
        oldestFile?: string;
        newestFile?: string;
        corruptedFiles: number;
    }> {
        try {
            const files = await this.listFiles(userId);
            
            if (files.length === 0) {
                return {
                    totalFiles: 0,
                    totalSize: 0,
                    corruptedFiles: 0
                };
            }

            const totalSize = files.reduce((sum, file) => sum + file.size, 0);
            const sortedByDate = [...files].sort((a, b) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            // Check for corrupted files
            let corruptedFiles = 0;
            for (const file of files) {
                const integrity = await this.verifyFileIntegrity(file.id, userId);
                if (!integrity.isValid) {
                    corruptedFiles++;
                }
            }

            return {
                totalFiles: files.length,
                totalSize,
                oldestFile: sortedByDate[0]?.filename,
                newestFile: sortedByDate[sortedByDate.length - 1]?.filename,
                corruptedFiles
            };
        } catch (error) {
            console.error('Failed to get storage stats:', error);
            throw new FileServiceError(
                'Failed to get storage statistics',
                'STATS_FAILED',
                500
            );
        }
    }
}

// Singleton instance
export const fileService = new FileService();