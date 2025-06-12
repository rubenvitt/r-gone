'use client'

import { useState, useCallback } from 'react'
import { BackupConfig, BackupEntry, RestoreResult } from '@/services/backup-service'
import { VerificationResult, SystemIntegrityReport, VerificationSchedule } from '@/services/backup-verification-service'

export interface BackupStats {
  totalBackups: number;
  completedBackups: number;
  failedBackups: number;
  totalBackupSize: number;
  oldestBackup?: string;
  newestBackup?: string;
  schedulerEnabled: boolean;
  nextScheduledBackup?: string;
}

export interface ExportInfo {
  exportId: string;
  timestamp: string;
  fileCount: number;
  size: number;
  path: string;
}

export interface UseBackupReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Config operations
  getConfig: () => Promise<BackupConfig | null>;
  updateConfig: (config: Partial<BackupConfig>) => Promise<boolean>;
  
  // Backup operations
  createBackup: (type?: 'manual' | 'automatic') => Promise<BackupEntry | null>;
  listBackups: (options?: {
    type?: 'automatic' | 'manual' | 'before-delete';
    status?: 'completed' | 'failed' | 'corrupted';
    limit?: number;
    offset?: number;
  }) => Promise<BackupEntry[]>;
  getBackupDetails: (backupId: string) => Promise<any>;
  deleteBackup: (backupId: string) => Promise<boolean>;
  verifyBackup: (backupId: string) => Promise<any>;
  
  // Export/Import operations
  createExport: (options?: {
    fileIds?: string[];
    includeMetadata?: boolean;
  }) => Promise<string | null>; // Returns exportId
  listExports: () => Promise<ExportInfo[]>;
  deleteExport: (exportId: string) => Promise<boolean>;
  importFromArchive: (archivePath: string, options?: {
    overwriteExisting?: boolean;
    skipOnConflict?: boolean;
    validateIntegrity?: boolean;
    dryRun?: boolean;
  }) => Promise<RestoreResult | null>;
  
  // Restore operations
  restoreFromBackup: (backupId: string, options?: {
    fileIds?: string[];
    overwriteExisting?: boolean;
    restoreToNewIds?: boolean;
    dryRun?: boolean;
  }) => Promise<RestoreResult | null>;
  
  // Statistics
  getStats: () => Promise<BackupStats | null>;
  
  // Verification
  generateSystemReport: (options?: {
    includeFileVerification?: boolean;
    includeRestoreTests?: boolean;
    maxBackupsToCheck?: number;
  }) => Promise<SystemIntegrityReport | null>;
  getVerificationReports: () => Promise<SystemIntegrityReport[]>;
  getVerificationSchedule: () => Promise<VerificationSchedule | null>;
  updateVerificationSchedule: (schedule: VerificationSchedule) => Promise<boolean>;
  performMaintenance: () => Promise<{ deletedReports: number; deletedBackups: number; errors: string[] } | null>;
  
  // Utility
  clearError: () => void;
}

export function useBackup(): UseBackupReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const getConfig = useCallback(async (): Promise<BackupConfig | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/config');
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.config;
      } else {
        handleError(new Error(result.error), 'Failed to get backup configuration');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to get backup configuration');
      return null;
    }
  }, [handleError]);

  const updateConfig = useCallback(async (config: Partial<BackupConfig>): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return true;
      } else {
        handleError(new Error(result.error), 'Failed to update backup configuration');
        return false;
      }
    } catch (error) {
      handleError(error, 'Failed to update backup configuration');
      return false;
    }
  }, [handleError]);

  const createBackup = useCallback(async (type: 'manual' | 'automatic' = 'manual'): Promise<BackupEntry | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.backup;
      } else {
        handleError(new Error(result.error), 'Failed to create backup');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to create backup');
      return null;
    }
  }, [handleError]);

  const listBackups = useCallback(async (options: {
    type?: 'automatic' | 'manual' | 'before-delete';
    status?: 'completed' | 'failed' | 'corrupted';
    limit?: number;
    offset?: number;
  } = {}): Promise<BackupEntry[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      
      if (options.type) searchParams.set('type', options.type);
      if (options.status) searchParams.set('status', options.status);
      if (options.limit) searchParams.set('limit', options.limit.toString());
      if (options.offset) searchParams.set('offset', options.offset.toString());

      const response = await fetch(`/api/backup/list?${searchParams}`);
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.backups;
      } else {
        handleError(new Error(result.error), 'Failed to list backups');
        return [];
      }
    } catch (error) {
      handleError(error, 'Failed to list backups');
      return [];
    }
  }, [handleError]);

  const getBackupDetails = useCallback(async (backupId: string): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/backup/${backupId}`);
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result;
      } else {
        handleError(new Error(result.error), 'Failed to get backup details');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to get backup details');
      return null;
    }
  }, [handleError]);

  const deleteBackup = useCallback(async (backupId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/backup/${backupId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return true;
      } else {
        handleError(new Error(result.error), 'Failed to delete backup');
        return false;
      }
    } catch (error) {
      handleError(error, 'Failed to delete backup');
      return false;
    }
  }, [handleError]);

  const verifyBackup = useCallback(async (backupId: string): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/backup/verify/${backupId}`);
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.verification;
      } else {
        handleError(new Error(result.error), 'Failed to verify backup');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to verify backup');
      return null;
    }
  }, [handleError]);

  const createExport = useCallback(async (options: {
    fileIds?: string[];
    includeMetadata?: boolean;
  } = {}): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.exportId;
      } else {
        handleError(new Error(result.error), 'Failed to create export');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to create export');
      return null;
    }
  }, [handleError]);

  const listExports = useCallback(async (): Promise<ExportInfo[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/export');
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.exports;
      } else {
        handleError(new Error(result.error), 'Failed to list exports');
        return [];
      }
    } catch (error) {
      handleError(error, 'Failed to list exports');
      return [];
    }
  }, [handleError]);

  const deleteExport = useCallback(async (exportId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/backup/export/${exportId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return true;
      } else {
        handleError(new Error(result.error), 'Failed to delete export');
        return false;
      }
    } catch (error) {
      handleError(error, 'Failed to delete export');
      return false;
    }
  }, [handleError]);

  const importFromArchive = useCallback(async (
    archivePath: string,
    options: {
      overwriteExisting?: boolean;
      skipOnConflict?: boolean;
      validateIntegrity?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<RestoreResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archivePath, ...options }),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result;
      } else {
        handleError(new Error(result.error), 'Failed to import archive');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to import archive');
      return null;
    }
  }, [handleError]);

  const restoreFromBackup = useCallback(async (
    backupId: string,
    options: {
      fileIds?: string[];
      overwriteExisting?: boolean;
      restoreToNewIds?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<RestoreResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/backup/restore/${backupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result;
      } else {
        handleError(new Error(result.error), 'Failed to restore from backup');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to restore from backup');
      return null;
    }
  }, [handleError]);

  const getStats = useCallback(async (): Promise<BackupStats | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/stats');
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.stats;
      } else {
        handleError(new Error(result.error), 'Failed to get backup statistics');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to get backup statistics');
      return null;
    }
  }, [handleError]);

  const generateSystemReport = useCallback(async (options: {
    includeFileVerification?: boolean;
    includeRestoreTests?: boolean;
    maxBackupsToCheck?: number;
  } = {}): Promise<SystemIntegrityReport | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/verify-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.report;
      } else {
        handleError(new Error(result.error), 'Failed to generate system integrity report');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to generate system integrity report');
      return null;
    }
  }, [handleError]);

  const getVerificationReports = useCallback(async (): Promise<SystemIntegrityReport[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/verify-system');
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.reports;
      } else {
        handleError(new Error(result.error), 'Failed to get verification reports');
        return [];
      }
    } catch (error) {
      handleError(error, 'Failed to get verification reports');
      return [];
    }
  }, [handleError]);

  const getVerificationSchedule = useCallback(async (): Promise<VerificationSchedule | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/verification-schedule');
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.schedule;
      } else {
        handleError(new Error(result.error), 'Failed to get verification schedule');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to get verification schedule');
      return null;
    }
  }, [handleError]);

  const updateVerificationSchedule = useCallback(async (schedule: VerificationSchedule): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/verification-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedule),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return true;
      } else {
        handleError(new Error(result.error), 'Failed to update verification schedule');
        return false;
      }
    } catch (error) {
      handleError(error, 'Failed to update verification schedule');
      return false;
    }
  }, [handleError]);

  const performMaintenance = useCallback(async (): Promise<{ deletedReports: number; deletedBackups: number; errors: string[] } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/maintenance', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.result;
      } else {
        handleError(new Error(result.error), 'Failed to perform maintenance');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to perform maintenance');
      return null;
    }
  }, [handleError]);

  return {
    isLoading,
    error,
    getConfig,
    updateConfig,
    createBackup,
    listBackups,
    getBackupDetails,
    deleteBackup,
    verifyBackup,
    createExport,
    listExports,
    deleteExport,
    importFromArchive,
    restoreFromBackup,
    getStats,
    generateSystemReport,
    getVerificationReports,
    getVerificationSchedule,
    updateVerificationSchedule,
    performMaintenance,
    clearError
  };
}