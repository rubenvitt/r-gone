import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
    BackupRecord,
    BackupStorageInfo,
    USBBackup,
    USBDeviceInfo,
    PaperBackup,
    PaperBackupPage,
    BackupProvider
} from '../../types/data';

export class LocalBackupService {
    private localBackupPath = path.join(process.cwd(), 'data', 'backups', 'local');
    private usbBackupPath = path.join(process.cwd(), 'data', 'backups', 'usb');
    private paperBackupPath = path.join(process.cwd(), 'data', 'backups', 'paper');

    constructor() {
        this.ensureDirectories();
    }

    private async ensureDirectories(): Promise<void> {
        try {
            await fs.mkdir(this.localBackupPath, { recursive: true });
            await fs.mkdir(this.usbBackupPath, { recursive: true });
            await fs.mkdir(this.paperBackupPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create local backup directories:', error);
        }
    }

    // Local file system backup
    async createLocalBackup(backup: BackupRecord, data: Buffer): Promise<BackupStorageInfo> {
        const filename = `${backup.id}_${Date.now()}.backup`;
        const filepath = path.join(this.localBackupPath, filename);

        try {
            // Create backup directory for this specific backup
            const backupDir = path.join(this.localBackupPath, backup.id);
            await fs.mkdir(backupDir, { recursive: true });

            const fullPath = path.join(backupDir, filename);

            // Write backup data
            await fs.writeFile(fullPath, data);

            // Create metadata file
            const metadataPath = path.join(backupDir, `${backup.id}.metadata.json`);
            const metadata = {
                backupId: backup.id,
                createdAt: backup.createdAt,
                size: data.length,
                checksum: this.calculateChecksum(data),
                type: backup.type,
                encryptionAlgorithm: backup.encryption.algorithm
            };
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

            const storageInfo: BackupStorageInfo = {
                provider: 'local',
                location: {
                    type: 'local',
                    physicalLocation: fullPath
                },
                path: fullPath,
                uploadedAt: new Date().toISOString(),
                size: data.length,
                checksum: this.calculateChecksum(data),
                redundancyLevel: 1
            };

            return storageInfo;

        } catch (error) {
            throw new Error(`Local backup creation failed: ${error}`);
        }
    }

    // USB/External device backup
    async createUSBBackup(
        backup: BackupRecord, 
        data: Buffer, 
        usbPath: string,
        deviceInfo?: Partial<USBDeviceInfo>
    ): Promise<USBBackup> {
        const usbBackupId = uuidv4();
        
        try {
            // Validate USB path exists and is writable
            await fs.access(usbPath, fs.constants.W_OK);

            // Create backup directory on USB
            const backupDir = path.join(usbPath, 'secure-backups', backup.id);
            await fs.mkdir(backupDir, { recursive: true });

            // Encrypt data specifically for USB (additional layer)
            const usbEncryptedData = await this.encryptForUSB(data, backup.id);
            
            const backupFilePath = path.join(backupDir, `backup_${Date.now()}.secure`);
            await fs.writeFile(backupFilePath, usbEncryptedData);

            // Create autorun file for Windows
            const autorunContent = `[autorun]
label=Secure Backup Drive
icon=backup.ico
action=Open Emergency Backup Access
shell\\open\\command=emergency-access.exe
`;
            await fs.writeFile(path.join(usbPath, 'autorun.inf'), autorunContent);

            // Create emergency access script
            const emergencyScript = this.generateEmergencyAccessScript(backup.id);
            await fs.writeFile(path.join(backupDir, 'emergency-access.html'), emergencyScript);

            // Create USB backup record
            const usbBackup: USBBackup = {
                id: usbBackupId,
                backupId: backup.id,
                deviceInfo: {
                    deviceId: deviceInfo?.deviceId || 'unknown',
                    manufacturer: deviceInfo?.manufacturer || 'Unknown',
                    model: deviceInfo?.model || 'Unknown',
                    capacity: deviceInfo?.capacity || 0,
                    filesystem: deviceInfo?.filesystem || 'unknown',
                    serialNumber: deviceInfo?.serialNumber,
                    lastConnected: new Date().toISOString()
                },
                createdAt: new Date().toISOString(),
                encryptionMethod: 'custom',
                autorunEnabled: true,
                portableMode: true,
                emergencyAccess: true
            };

            // Save USB backup metadata
            const metadataPath = path.join(backupDir, 'usb-backup.json');
            await fs.writeFile(metadataPath, JSON.stringify(usbBackup, null, 2));

            return usbBackup;

        } catch (error) {
            throw new Error(`USB backup creation failed: ${error}`);
        }
    }

    // Paper backup generation
    async createPaperBackup(backup: BackupRecord, data: Buffer): Promise<PaperBackup> {
        const paperBackupId = uuidv4();
        
        try {
            // Convert data to base64 for text representation
            const base64Data = data.toString('base64');
            
            // Split data into pages (max 2000 chars per page for readability)
            const charsPerPage = 2000;
            const totalPages = Math.ceil(base64Data.length / charsPerPage);
            const pages: PaperBackupPage[] = [];

            for (let i = 0; i < totalPages; i++) {
                const startIndex = i * charsPerPage;
                const endIndex = Math.min(startIndex + charsPerPage, base64Data.length);
                const pageContent = base64Data.substring(startIndex, endIndex);
                
                const page: PaperBackupPage = {
                    pageNumber: i + 1,
                    content: pageContent,
                    qrCodes: await this.generateQRCodes(pageContent),
                    checksum: this.calculateChecksum(Buffer.from(pageContent)),
                    redundantData: i === 0 // First page contains recovery info
                };

                pages.push(page);
            }

            const paperBackup: PaperBackup = {
                id: paperBackupId,
                backupId: backup.id,
                generatedAt: new Date().toISOString(),
                format: 'mixed',
                pages,
                redundancyLevel: 3, // Print 3 copies
                watermark: `SECURE BACKUP - ${backup.id.substring(0, 8).toUpperCase()}`,
                instructions: this.generatePaperBackupInstructions(backup.id),
                emergencyContacts: []
            };

            // Generate printable HTML version
            const printableHTML = await this.generatePrintablePaperBackup(paperBackup);
            const htmlPath = path.join(this.paperBackupPath, `${paperBackupId}.html`);
            await fs.writeFile(htmlPath, printableHTML);

            // Save paper backup metadata
            const metadataPath = path.join(this.paperBackupPath, `${paperBackupId}.json`);
            await fs.writeFile(metadataPath, JSON.stringify(paperBackup, null, 2));

            return paperBackup;

        } catch (error) {
            throw new Error(`Paper backup creation failed: ${error}`);
        }
    }

    // Local backup retrieval
    async retrieveLocalBackup(backupId: string): Promise<Buffer | null> {
        try {
            const backupDir = path.join(this.localBackupPath, backupId);
            const files = await fs.readdir(backupDir);
            
            // Find the backup file (not metadata)
            const backupFile = files.find(f => f.endsWith('.backup'));
            if (!backupFile) {
                return null;
            }

            const backupPath = path.join(backupDir, backupFile);
            return await fs.readFile(backupPath);

        } catch (error) {
            console.error(`Failed to retrieve local backup ${backupId}:`, error);
            return null;
        }
    }

    // USB backup retrieval
    async retrieveUSBBackup(usbPath: string, backupId: string): Promise<Buffer | null> {
        try {
            const backupDir = path.join(usbPath, 'secure-backups', backupId);
            const files = await fs.readdir(backupDir);
            
            const backupFile = files.find(f => f.endsWith('.secure'));
            if (!backupFile) {
                return null;
            }

            const encryptedData = await fs.readFile(path.join(backupDir, backupFile));
            return await this.decryptFromUSB(encryptedData, backupId);

        } catch (error) {
            console.error(`Failed to retrieve USB backup ${backupId}:`, error);
            return null;
        }
    }

    // Delete local backup
    async deleteLocalBackup(backupId: string): Promise<boolean> {
        try {
            const backupDir = path.join(this.localBackupPath, backupId);
            
            // Check if directory exists
            try {
                await fs.access(backupDir);
            } catch {
                return true; // Already deleted
            }

            // Remove directory and all contents
            await fs.rm(backupDir, { recursive: true, force: true });
            return true;

        } catch (error) {
            console.error(`Failed to delete local backup ${backupId}:`, error);
            return false;
        }
    }

    // Verify local backup integrity
    async verifyLocalBackup(backupId: string, expectedChecksum: string): Promise<boolean> {
        try {
            const data = await this.retrieveLocalBackup(backupId);
            if (!data) {
                return false;
            }

            const actualChecksum = this.calculateChecksum(data);
            return actualChecksum === expectedChecksum;

        } catch (error) {
            console.error(`Failed to verify local backup ${backupId}:`, error);
            return false;
        }
    }

    // Get local storage statistics
    async getLocalStorageStats(): Promise<{ totalSize: number; backupCount: number; availableSpace: number }> {
        try {
            const stats = await fs.stat(this.localBackupPath);
            let totalSize = 0;
            let backupCount = 0;

            const backupDirs = await fs.readdir(this.localBackupPath);
            for (const dir of backupDirs) {
                const dirPath = path.join(this.localBackupPath, dir);
                const dirStat = await fs.stat(dirPath);
                
                if (dirStat.isDirectory()) {
                    backupCount++;
                    const files = await fs.readdir(dirPath);
                    
                    for (const file of files) {
                        const filePath = path.join(dirPath, file);
                        const fileStat = await fs.stat(filePath);
                        totalSize += fileStat.size;
                    }
                }
            }

            // Get available disk space (simplified)
            const availableSpace = 1024 * 1024 * 1024 * 10; // Mock 10GB available

            return {
                totalSize,
                backupCount,
                availableSpace
            };

        } catch (error) {
            console.error('Failed to get local storage stats:', error);
            return { totalSize: 0, backupCount: 0, availableSpace: 0 };
        }
    }

    // Helper methods
    private calculateChecksum(data: Buffer): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    private async encryptForUSB(data: Buffer, backupId: string): Promise<Buffer> {
        // Additional encryption layer for USB storage
        const key = crypto.pbkdf2Sync(backupId, 'usb-backup-salt', 100000, 32, 'sha512');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
        
        let encrypted = cipher.update(data);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();
        
        return Buffer.concat([iv, authTag, encrypted]);
    }

    private async decryptFromUSB(encryptedData: Buffer, backupId: string): Promise<Buffer> {
        const key = crypto.pbkdf2Sync(backupId, 'usb-backup-salt', 100000, 32, 'sha512');
        const iv = encryptedData.slice(0, 16);
        const authTag = encryptedData.slice(16, 32);
        const encrypted = encryptedData.slice(32);
        
        const decipher = crypto.createDecipherGCM('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted;
    }

    private async generateQRCodes(content: string): Promise<string[]> {
        // Split content into QR code sized chunks (max ~2953 chars for QR code)
        const chunkSize = 2000;
        const chunks = [];
        
        for (let i = 0; i < content.length; i += chunkSize) {
            chunks.push(content.substring(i, i + chunkSize));
        }

        // Mock QR code generation - in real implementation would use QR library
        return chunks.map((chunk, index) => `QR_CODE_${index}_DATA:${chunk.substring(0, 50)}...`);
    }

    private generatePaperBackupInstructions(backupId: string): string {
        return `
EMERGENCY BACKUP RECOVERY INSTRUCTIONS

Backup ID: ${backupId}
Generated: ${new Date().toISOString()}

IMPORTANT: This is a secure backup of critical information. Keep this document safe and confidential.

RECOVERY STEPS:
1. Visit the recovery website: [RECOVERY_URL]
2. Enter the backup ID: ${backupId}
3. Input the recovery data from the pages below
4. Follow the decryption instructions

MANUAL RECOVERY:
If the online service is unavailable, the data below can be manually processed:
- Each page contains Base64 encoded encrypted data
- Use the QR codes for easier data entry
- The first page contains recovery metadata

SECURITY NOTES:
- This backup is encrypted with AES-256-GCM
- The decryption key is derived from your master password
- Store this document separate from digital devices
- Consider storing copies in multiple secure locations

For emergency assistance, contact: [EMERGENCY_CONTACT]
`;
    }

    private async generatePrintablePaperBackup(paperBackup: PaperBackup): Promise<string> {
        let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Secure Paper Backup - ${paperBackup.id}</title>
    <style>
        body { font-family: 'Courier New', monospace; font-size: 10px; margin: 20px; }
        .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); 
                     font-size: 48px; color: rgba(0,0,0,0.1); z-index: -1; }
        .page { page-break-after: always; margin-bottom: 40px; }
        .page-header { font-weight: bold; margin-bottom: 10px; }
        .content { word-wrap: break-word; line-height: 1.2; }
        .checksum { margin-top: 10px; font-size: 8px; }
        .instructions { background: #f0f0f0; padding: 10px; margin-bottom: 20px; }
        @media print { .page { page-break-after: always; } }
    </style>
</head>
<body>
    <div class="watermark">${paperBackup.watermark}</div>
    
    <div class="header">
        <h1>SECURE EMERGENCY BACKUP</h1>
        <p>Backup ID: ${paperBackup.backupId}</p>
        <p>Generated: ${paperBackup.generatedAt}</p>
        <p>Total Pages: ${paperBackup.pages.length}</p>
    </div>

    <div class="instructions">
        <h3>RECOVERY INSTRUCTIONS</h3>
        <pre>${paperBackup.instructions}</pre>
    </div>
`;

        paperBackup.pages.forEach((page, index) => {
            html += `
    <div class="page">
        <div class="page-header">
            PAGE ${page.pageNumber} OF ${paperBackup.pages.length}
            ${page.redundantData ? '(CONTAINS RECOVERY METADATA)' : ''}
        </div>
        <div class="content">
            ${this.formatContentForPrint(page.content)}
        </div>
        <div class="checksum">
            Page Checksum: ${page.checksum}
        </div>
        <div class="qr-codes">
            <h4>QR CODES FOR THIS PAGE:</h4>
            ${page.qrCodes?.map((qr, i) => `<p>QR ${i + 1}: ${qr}</p>`).join('') || ''}
        </div>
    </div>
`;
        });

        html += `
</body>
</html>
`;

        return html;
    }

    private formatContentForPrint(content: string): string {
        // Format content in blocks of 80 characters for readability
        const blockSize = 80;
        let formatted = '';
        
        for (let i = 0; i < content.length; i += blockSize) {
            formatted += content.substring(i, i + blockSize) + '\n';
        }
        
        return formatted;
    }

    private generateEmergencyAccessScript(backupId: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Emergency Backup Access</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; color: #d32f2f; }
        .instructions { background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .backup-info { background: #e3f2fd; padding: 15px; border-radius: 5px; }
        .emergency { background: #ffebee; padding: 15px; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 EMERGENCY BACKUP ACCESS</h1>
            <h2>Secure Information Recovery System</h2>
        </div>

        <div class="backup-info">
            <h3>Backup Information</h3>
            <p><strong>Backup ID:</strong> ${backupId}</p>
            <p><strong>Created:</strong> ${new Date().toISOString()}</p>
            <p><strong>Type:</strong> Portable USB Backup</p>
        </div>

        <div class="instructions">
            <h3>📋 Recovery Instructions</h3>
            <ol>
                <li><strong>Online Recovery (Recommended):</strong>
                    <ul>
                        <li>Visit: <code>[RECOVERY_WEBSITE]</code></li>
                        <li>Enter Backup ID: <code>${backupId}</code></li>
                        <li>Follow the guided recovery process</li>
                    </ul>
                </li>
                <li><strong>Offline Recovery:</strong>
                    <ul>
                        <li>Use the backup files in the <code>backup_data</code> folder</li>
                        <li>Follow the manual recovery guide (included)</li>
                        <li>Contact emergency support if needed</li>
                    </ul>
                </li>
            </ol>
        </div>

        <div class="emergency">
            <h3>🚨 Emergency Contact Information</h3>
            <p>If you need immediate assistance recovering this backup:</p>
            <ul>
                <li><strong>Emergency Email:</strong> [EMERGENCY_EMAIL]</li>
                <li><strong>Emergency Phone:</strong> [EMERGENCY_PHONE]</li>
                <li><strong>Reference Code:</strong> USB-${backupId.substring(0, 8)}</li>
            </ul>
        </div>

        <div class="emergency">
            <h3>⚠️ Security Notice</h3>
            <p>This backup contains encrypted sensitive information. The data is protected with military-grade encryption and requires proper authentication to access.</p>
            <p><strong>If you are not an authorized beneficiary, please contact the emergency contacts above immediately.</strong></p>
        </div>
    </div>
</body>
</html>
`;
    }

    // Static methods for detecting USB devices
    static async detectUSBDevices(): Promise<USBDeviceInfo[]> {
        // Mock USB device detection - in real implementation would use native modules
        return [
            {
                deviceId: 'usb-001',
                manufacturer: 'SanDisk',
                model: 'Ultra USB 3.0',
                capacity: 32 * 1024 * 1024 * 1024, // 32GB
                filesystem: 'FAT32',
                serialNumber: 'SD123456789',
                lastConnected: new Date().toISOString()
            },
            {
                deviceId: 'usb-002',
                manufacturer: 'Kingston',
                model: 'DataTraveler',
                capacity: 64 * 1024 * 1024 * 1024, // 64GB
                filesystem: 'NTFS',
                serialNumber: 'KT987654321'
            }
        ];
    }

    static async isUSBWritable(usbPath: string): Promise<boolean> {
        try {
            await fs.access(usbPath, fs.constants.W_OK);
            return true;
        } catch {
            return false;
        }
    }
}

export const localBackupService = new LocalBackupService();