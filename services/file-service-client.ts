// Client-side file service that uses API routes
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
    isBackup?: boolean;
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
    isBackup?: boolean;
}

export interface SaveResult {
    success: boolean;
    fileId?: string;
    version?: number;
    error?: string;
}

export class FileServiceError extends Error {
    constructor(message: string, public code: string, public statusCode: number) {
        super(message);
        this.name = 'FileServiceError';
    }
}

export class FileServiceClient {
    private static instance: FileServiceClient;
    
    static getInstance(): FileServiceClient {
        if (!FileServiceClient.instance) {
            FileServiceClient.instance = new FileServiceClient();
        }
        return FileServiceClient.instance;
    }

    async listFiles(): Promise<FileListItem[]> {
        try {
            const response = await fetch('/api/files');
            if (!response.ok) {
                throw new FileServiceError('Failed to list files', 'LIST_ERROR', response.status);
            }
            const data = await response.json();
            return data.files || [];
        } catch (error) {
            if (error instanceof FileServiceError) throw error;
            throw new FileServiceError('Failed to list files', 'NETWORK_ERROR', 500);
        }
    }

    async saveFile(fileId: string, data: EncryptedDataFile, metadata?: Partial<FileMetadata>): Promise<SaveResult> {
        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, metadata })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new FileServiceError(error.message || 'Failed to save file', 'SAVE_ERROR', response.status);
            }
            
            return await response.json();
        } catch (error) {
            if (error instanceof FileServiceError) throw error;
            throw new FileServiceError('Failed to save file', 'NETWORK_ERROR', 500);
        }
    }

    async loadFile(fileId: string): Promise<EncryptedDataFile> {
        try {
            const response = await fetch(`/api/files/${fileId}`);
            if (!response.ok) {
                throw new FileServiceError('File not found', 'NOT_FOUND', response.status);
            }
            const data = await response.json();
            return data.file;
        } catch (error) {
            if (error instanceof FileServiceError) throw error;
            throw new FileServiceError('Failed to load file', 'NETWORK_ERROR', 500);
        }
    }

    async deleteFile(fileId: string): Promise<void> {
        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new FileServiceError('Failed to delete file', 'DELETE_ERROR', response.status);
            }
        } catch (error) {
            if (error instanceof FileServiceError) throw error;
            throw new FileServiceError('Failed to delete file', 'NETWORK_ERROR', 500);
        }
    }

    async createBackup(fileId: string): Promise<SaveResult> {
        try {
            const response = await fetch(`/api/files/${fileId}/backup`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new FileServiceError('Failed to create backup', 'BACKUP_ERROR', response.status);
            }
            
            return await response.json();
        } catch (error) {
            if (error instanceof FileServiceError) throw error;
            throw new FileServiceError('Failed to create backup', 'NETWORK_ERROR', 500);
        }
    }
}

export const fileService = FileServiceClient.getInstance();