import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { RecoveryCode } from '../types/data';
import { auditLoggingService } from './audit-logging-service';

export class EmergencyRecoveryService {
    private emergencyRecoveryPath = path.join(process.cwd(), 'data', 'recovery', 'emergency');
    private codesPath = path.join(this.emergencyRecoveryPath, 'codes');
    private usageLogPath = path.join(this.emergencyRecoveryPath, 'usage-log.json');

    constructor() {
        this.ensureDirectories();
    }

    private async ensureDirectories(): Promise<void> {
        try {
            await fs.mkdir(this.emergencyRecoveryPath, { recursive: true });
            await fs.mkdir(this.codesPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create emergency recovery directories:', error);
        }
    }

    // Generate new set of emergency recovery codes
    async generateEmergencyCodes(count: number = 10, codeLength: number = 12): Promise<RecoveryCode[]> {
        try {
            // Revoke existing unused codes
            await this.revokeUnusedCodes();

            const codes: RecoveryCode[] = [];
            const expirationDate = new Date();
            expirationDate.setFullYear(expirationDate.getFullYear() + 1); // Codes expire in 1 year

            for (let i = 0; i < count; i++) {
                const code: RecoveryCode = {
                    id: uuidv4(),
                    code: this.generateSecureCode(codeLength),
                    purpose: 'emergency_access',
                    isUsed: false,
                    expiresAt: expirationDate.toISOString(),
                    createdAt: new Date().toISOString()
                };

                codes.push(code);

                // Save individual code file
                const codePath = path.join(this.codesPath, `${code.id}.json`);
                await fs.writeFile(codePath, JSON.stringify(code, null, 2));
            }

            await this.logEmergencyEvent('emergency_codes_generated', {
                codeCount: count,
                codeLength,
                expiresAt: expirationDate.toISOString()
            });

            return codes;
        } catch (error) {
            console.error('Failed to generate emergency codes:', error);
            throw new Error(`Failed to generate emergency codes: ${error}`);
        }
    }

    // Generate a cryptographically secure code
    private generateSecureCode(length: number): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, characters.length);
            result += characters[randomIndex];
        }

        // Format code in groups of 4 for readability
        return result.match(/.{1,4}/g)?.join('-') || result;
    }

    // Validate and use emergency recovery code
    async validateAndUseCode(code: string, metadata: {
        ipAddress?: string;
        userAgent?: string;
        location?: string;
        deviceFingerprint?: string;
    } = {}): Promise<{
        isValid: boolean;
        codeData?: RecoveryCode;
        reason?: string;
    }> {
        try {
            // Normalize code format
            const normalizedCode = code.replace(/[-\s]/g, '').toUpperCase();
            
            // Find the code
            const codeData = await this.findCodeByValue(normalizedCode);
            
            if (!codeData) {
                await this.logCodeUsageAttempt(code, false, 'Code not found', metadata);
                return { isValid: false, reason: 'Invalid code' };
            }

            if (codeData.isUsed) {
                await this.logCodeUsageAttempt(code, false, 'Code already used', metadata);
                return { isValid: false, reason: 'Code has already been used' };
            }

            if (codeData.expiresAt && new Date(codeData.expiresAt) < new Date()) {
                await this.logCodeUsageAttempt(code, false, 'Code expired', metadata);
                return { isValid: false, reason: 'Code has expired' };
            }

            // Check location restrictions if any
            if (codeData.restrictedTo && metadata.ipAddress) {
                if (!this.checkLocationRestriction(codeData.restrictedTo, metadata.ipAddress)) {
                    await this.logCodeUsageAttempt(code, false, 'Location restriction violation', metadata);
                    return { isValid: false, reason: 'Code cannot be used from this location' };
                }
            }

            // Mark code as used
            codeData.isUsed = true;
            codeData.usedAt = new Date().toISOString();

            // Save updated code
            const codePath = path.join(this.codesPath, `${codeData.id}.json`);
            await fs.writeFile(codePath, JSON.stringify(codeData, null, 2));

            await this.logCodeUsageAttempt(code, true, 'Code successfully used', metadata);
            
            await this.logEmergencyEvent('emergency_code_used', {
                codeId: codeData.id,
                purpose: codeData.purpose,
                usedAt: codeData.usedAt,
                metadata
            });

            return { isValid: true, codeData };
        } catch (error) {
            console.error('Failed to validate emergency code:', error);
            await this.logCodeUsageAttempt(code, false, 'Validation error', metadata);
            return { isValid: false, reason: 'Code validation failed' };
        }
    }

    // Find code by its value
    private async findCodeByValue(normalizedCode: string): Promise<RecoveryCode | null> {
        try {
            const files = await fs.readdir(this.codesPath);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const codeData = await fs.readFile(path.join(this.codesPath, file), 'utf-8');
                    const code: RecoveryCode = JSON.parse(codeData);
                    
                    // Normalize stored code for comparison
                    const storedNormalized = code.code.replace(/[-\s]/g, '').toUpperCase();
                    
                    if (storedNormalized === normalizedCode) {
                        return code;
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Failed to find code:', error);
            return null;
        }
    }

    // Check location restriction
    private checkLocationRestriction(restriction: string, ipAddress: string): boolean {
        // Simplified location check - in real implementation would use IP geolocation
        return restriction === ipAddress || restriction === 'any';
    }

    // Get all emergency codes (admin only)
    async getAllCodes(): Promise<RecoveryCode[]> {
        try {
            const files = await fs.readdir(this.codesPath);
            const codes: RecoveryCode[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const codeData = await fs.readFile(path.join(this.codesPath, file), 'utf-8');
                    codes.push(JSON.parse(codeData));
                }
            }

            return codes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch {
            return [];
        }
    }

    // Get code statistics (without revealing actual codes)
    async getCodeStatistics(): Promise<{
        totalCodes: number;
        unusedCodes: number;
        usedCodes: number;
        expiredCodes: number;
        codesExpiringWithin30Days: number;
        lastGeneratedAt?: string;
        oldestUnusedCode?: string;
    }> {
        try {
            const codes = await this.getAllCodes();
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            const stats = {
                totalCodes: codes.length,
                unusedCodes: codes.filter(c => !c.isUsed).length,
                usedCodes: codes.filter(c => c.isUsed).length,
                expiredCodes: codes.filter(c => c.expiresAt && new Date(c.expiresAt) < now).length,
                codesExpiringWithin30Days: codes.filter(c => 
                    c.expiresAt && 
                    new Date(c.expiresAt) < thirtyDaysFromNow && 
                    new Date(c.expiresAt) > now &&
                    !c.isUsed
                ).length,
                lastGeneratedAt: codes.length > 0 ? codes[0].createdAt : undefined,
                oldestUnusedCode: codes
                    .filter(c => !c.isUsed && (!c.expiresAt || new Date(c.expiresAt) > now))
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]?.createdAt
            };

            return stats;
        } catch (error) {
            console.error('Failed to get code statistics:', error);
            throw new Error('Failed to get code statistics');
        }
    }

    // Revoke specific emergency code
    async revokeCode(codeId: string, reason: string = 'Manual revocation'): Promise<boolean> {
        try {
            const codePath = path.join(this.codesPath, `${codeId}.json`);
            
            try {
                const codeData = await fs.readFile(codePath, 'utf-8');
                const code: RecoveryCode = JSON.parse(codeData);
                
                if (code.isUsed) {
                    return false; // Cannot revoke already used codes
                }

                // Mark as used to effectively revoke it
                code.isUsed = true;
                code.usedAt = new Date().toISOString();
                
                await fs.writeFile(codePath, JSON.stringify(code, null, 2));
                
                await this.logEmergencyEvent('emergency_code_revoked', {
                    codeId,
                    reason,
                    revokedAt: code.usedAt
                });
                
                return true;
            } catch {
                return false; // Code file not found
            }
        } catch (error) {
            console.error('Failed to revoke emergency code:', error);
            return false;
        }
    }

    // Revoke all unused codes
    async revokeUnusedCodes(): Promise<number> {
        try {
            const codes = await this.getAllCodes();
            const unusedCodes = codes.filter(c => !c.isUsed);
            let revokedCount = 0;

            for (const code of unusedCodes) {
                const success = await this.revokeCode(code.id, 'Bulk revocation');
                if (success) {
                    revokedCount++;
                }
            }

            if (revokedCount > 0) {
                await this.logEmergencyEvent('emergency_codes_bulk_revoked', {
                    revokedCount,
                    totalCodes: codes.length
                });
            }

            return revokedCount;
        } catch (error) {
            console.error('Failed to revoke unused codes:', error);
            return 0;
        }
    }

    // Cleanup expired codes
    async cleanupExpiredCodes(): Promise<number> {
        try {
            const codes = await this.getAllCodes();
            const now = new Date();
            const expiredCodes = codes.filter(c => c.expiresAt && new Date(c.expiresAt) < now);
            
            let cleanedCount = 0;
            
            for (const code of expiredCodes) {
                try {
                    const codePath = path.join(this.codesPath, `${code.id}.json`);
                    await fs.unlink(codePath);
                    cleanedCount++;
                } catch (error) {
                    console.error(`Failed to delete expired code ${code.id}:`, error);
                }
            }

            if (cleanedCount > 0) {
                await this.logEmergencyEvent('expired_codes_cleaned', {
                    cleanedCount,
                    totalExpiredCodes: expiredCodes.length
                });
            }

            return cleanedCount;
        } catch (error) {
            console.error('Failed to cleanup expired codes:', error);
            return 0;
        }
    }

    // Generate printable emergency codes sheet
    async generatePrintableCodeSheet(): Promise<string> {
        try {
            const codes = await this.getAllCodes();
            const unusedCodes = codes.filter(c => !c.isUsed && (!c.expiresAt || new Date(c.expiresAt) > new Date()));

            if (unusedCodes.length === 0) {
                throw new Error('No unused emergency codes available');
            }

            const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Emergency Recovery Codes</title>
    <style>
        body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            margin: 20px;
            background: white;
        }
        .header { 
            text-align: center; 
            font-weight: bold; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .codes-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        .code-item {
            border: 1px solid #ddd;
            padding: 10px;
            background: #f9f9f9;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            text-align: center;
            font-weight: bold;
        }
        .instructions {
            margin-top: 30px;
            padding: 15px;
            background: #e3f2fd;
            border-radius: 5px;
        }
        .footer {
            margin-top: 40px;
            font-size: 10px;
            text-align: center;
            color: #666;
        }
        @media print {
            .codes-grid { page-break-inside: avoid; }
            .warning { page-break-inside: avoid; }
            .instructions { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 EMERGENCY RECOVERY CODES</h1>
        <p>Secure Information Management System</p>
        <p>Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>

    <div class="warning">
        <h3>⚠️ IMPORTANT SECURITY NOTICE</h3>
        <ul>
            <li>Each code can only be used ONCE</li>
            <li>Store this document in a secure location</li>
            <li>Do NOT share these codes with anyone</li>
            <li>Consider storing copies in multiple secure locations</li>
            <li>These codes expire on: ${unusedCodes[0]?.expiresAt ? new Date(unusedCodes[0].expiresAt).toLocaleDateString() : 'N/A'}</li>
        </ul>
    </div>

    <div class="codes-grid">
        ${unusedCodes.map((code, index) => `
            <div class="code-item">
                <div style="font-size: 10px; color: #666;">Code ${index + 1}</div>
                <div>${code.code}</div>
            </div>
        `).join('')}
    </div>

    <div class="instructions">
        <h3>📋 HOW TO USE EMERGENCY CODES</h3>
        <ol>
            <li><strong>Emergency Access:</strong> Visit the recovery page at [RECOVERY_URL]</li>
            <li><strong>Select Recovery Method:</strong> Choose "Emergency Recovery Code"</li>
            <li><strong>Enter Code:</strong> Type one of the codes above exactly as shown</li>
            <li><strong>Complete Verification:</strong> Follow additional verification steps if required</li>
            <li><strong>Cross Out Used Code:</strong> Mark the code as used once you've successfully recovered access</li>
        </ol>
        
        <h3>🆘 SUPPORT CONTACT</h3>
        <p>If you need assistance with emergency recovery:</p>
        <ul>
            <li><strong>Emergency Email:</strong> [EMERGENCY_EMAIL]</li>
            <li><strong>Emergency Phone:</strong> [EMERGENCY_PHONE]</li>
            <li><strong>Reference ID:</strong> EMG-${unusedCodes[0]?.id.substring(0, 8).toUpperCase()}</li>
        </ul>
    </div>

    <div class="footer">
        <p>This document contains ${unusedCodes.length} emergency recovery codes.</p>
        <p>Generated by If I'm Gone - Secure Information Management System</p>
        <p><strong>CONFIDENTIAL:</strong> Destroy this document securely if no longer needed</p>
    </div>
</body>
</html>`;

            await this.logEmergencyEvent('printable_codes_generated', {
                codeCount: unusedCodes.length,
                generatedAt: new Date().toISOString()
            });

            return html;
        } catch (error) {
            console.error('Failed to generate printable code sheet:', error);
            throw new Error(`Failed to generate printable code sheet: ${error}`);
        }
    }

    // Get usage logs
    async getUsageLogs(): Promise<Array<{
        timestamp: string;
        code: string;
        success: boolean;
        reason: string;
        metadata: Record<string, any>;
    }>> {
        try {
            const logData = await fs.readFile(this.usageLogPath, 'utf-8');
            const logs = JSON.parse(logData);
            return logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch {
            return [];
        }
    }

    // Log code usage attempt
    private async logCodeUsageAttempt(
        code: string, 
        success: boolean, 
        reason: string, 
        metadata: Record<string, any>
    ): Promise<void> {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                code: code.substring(0, 4) + '****', // Only log first 4 characters for security
                success,
                reason,
                metadata
            };

            let logs: any[] = [];
            try {
                const existingLogs = await fs.readFile(this.usageLogPath, 'utf-8');
                logs = JSON.parse(existingLogs);
            } catch {
                // File doesn't exist or is empty
            }

            logs.push(logEntry);
            
            // Keep only last 1000 log entries
            if (logs.length > 1000) {
                logs = logs.slice(-1000);
            }

            await fs.writeFile(this.usageLogPath, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Failed to log code usage attempt:', error);
        }
    }

    private async logEmergencyEvent(eventType: string, details: any): Promise<void> {
        await auditLoggingService.logEvent({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            eventType: 'emergency_recovery',
            action: eventType,
            result: 'success',
            details,
            riskLevel: 'high',
            hash: ''
        });
    }

    // Maintenance and monitoring
    async performMaintenance(): Promise<{
        expiredCodesRemoved: number;
        totalActiveCodesRemaining: number;
        warnings: string[];
    }> {
        try {
            const expiredCodesRemoved = await this.cleanupExpiredCodes();
            const stats = await this.getCodeStatistics();
            const warnings: string[] = [];

            if (stats.unusedCodes < 3) {
                warnings.push('Low number of unused emergency codes remaining');
            }

            if (stats.codesExpiringWithin30Days > 0) {
                warnings.push(`${stats.codesExpiringWithin30Days} codes will expire within 30 days`);
            }

            if (stats.totalCodes === 0) {
                warnings.push('No emergency codes configured');
            }

            await this.logEmergencyEvent('maintenance_performed', {
                expiredCodesRemoved,
                totalActiveCodesRemaining: stats.unusedCodes,
                warnings
            });

            return {
                expiredCodesRemoved,
                totalActiveCodesRemaining: stats.unusedCodes,
                warnings
            };
        } catch (error) {
            console.error('Failed to perform emergency recovery maintenance:', error);
            throw new Error('Failed to perform maintenance');
        }
    }
}

export const emergencyRecoveryService = new EmergencyRecoveryService();