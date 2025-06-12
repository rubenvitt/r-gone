import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
    RecoveryMechanism,
    RecoveryType,
    RecoveryAttempt,
    RecoveryAttemptStatus,
    RecoveryConfiguration,
    RecoveryGlobalSettings,
    RecoveryStatistics,
    SecurityQuestion,
    TrustedContact,
    RecoveryCode,
    BiometricTemplate,
    RecoveryVerificationStep,
    RecoveryApproval,
    RecoveryAuditEntry,
    AuthorizedPerson,
    LegalRecoveryDocument
} from '../types/data';
import { auditLoggingService } from './audit-logging-service';

export class RecoveryService {
    private recoveryDataPath = path.join(process.cwd(), 'data', 'recovery');
    private configPath = path.join(this.recoveryDataPath, 'recovery-config.json');
    private attemptsPath = path.join(this.recoveryDataPath, 'attempts');
    private mechanismsPath = path.join(this.recoveryDataPath, 'mechanisms');

    constructor() {
        this.ensureDirectories();
        this.initializeDefaultConfiguration();
    }

    private async ensureDirectories(): Promise<void> {
        try {
            await fs.mkdir(this.recoveryDataPath, { recursive: true });
            await fs.mkdir(this.attemptsPath, { recursive: true });
            await fs.mkdir(this.mechanismsPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create recovery directories:', error);
        }
    }

    // Initialize default recovery configuration
    private async initializeDefaultConfiguration(): Promise<void> {
        try {
            await fs.access(this.configPath);
        } catch {
            // Config doesn't exist, create default
            const defaultConfig: RecoveryConfiguration = {
                globalSettings: {
                    enabled: true,
                    requireMultipleVerification: true,
                    allowSelfRecovery: true,
                    requireTimeDelay: true,
                    defaultTimeDelayHours: 24,
                    maxAttempts: 3,
                    attemptLockoutHours: 24,
                    requireAuditLog: true,
                    enableRiskAssessment: true
                },
                mechanisms: [],
                emergencySettings: {
                    enableEmergencyCodes: true,
                    codeCount: 10,
                    codeLength: 12,
                    codeExpiration: 365,
                    requireSecondaryVerification: true,
                    allowBypassTimeDelay: false,
                    emergencyContacts: [],
                    autoNotifyEmergency: true
                },
                legalSettings: {
                    enableLegalRecovery: true,
                    acceptedDocuments: ['will', 'trust', 'power_of_attorney', 'court_order', 'death_certificate'],
                    requireNotarization: true,
                    requireMultipleDocuments: false,
                    verificationPeriod: 30,
                    appealProcess: true,
                    legalContactInfo: ''
                },
                securitySettings: {
                    enableBiometrics: false,
                    biometricTypes: [],
                    requireHardwareToken: false,
                    enableGeolocation: true,
                    allowedLocations: [],
                    requireKnownDevice: false,
                    enableRiskScoring: true,
                    riskThresholds: {
                        low: 30,
                        medium: 60,
                        high: 85
                    }
                },
                notificationSettings: {
                    notifyOnAttempt: true,
                    notifyOnSuccess: true,
                    notifyOnFailure: true,
                    notifyTrustedContacts: true,
                    notificationMethods: ['email'],
                    emergencyNotificationDelay: 30,
                    includeLocationData: true,
                    includeDeviceInfo: true
                }
            };

            await fs.writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2));
        }
    }

    // Get recovery configuration
    async getConfiguration(): Promise<RecoveryConfiguration> {
        try {
            const configData = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(configData);
        } catch (error) {
            console.error('Failed to read recovery configuration:', error);
            throw new Error('Recovery configuration not available');
        }
    }

    // Update recovery configuration
    async updateConfiguration(config: Partial<RecoveryConfiguration>): Promise<RecoveryConfiguration> {
        try {
            const currentConfig = await this.getConfiguration();
            const updatedConfig = { ...currentConfig, ...config };

            await fs.writeFile(this.configPath, JSON.stringify(updatedConfig, null, 2));

            await this.logRecoveryEvent('configuration_updated', {
                changes: Object.keys(config),
                timestamp: new Date().toISOString()
            });

            return updatedConfig;
        } catch (error) {
            console.error('Failed to update recovery configuration:', error);
            throw new Error('Failed to update recovery configuration');
        }
    }

    // Initialize recovery mechanism
    async setupRecoveryMechanism(type: RecoveryType, configuration: any): Promise<RecoveryMechanism> {
        try {
            const mechanism: RecoveryMechanism = {
                id: uuidv4(),
                type,
                name: this.getRecoveryMechanismName(type),
                description: this.getRecoveryMechanismDescription(type),
                isActive: true,
                isSetup: false,
                priority: await this.getNextPriority(),
                configuration,
                successRate: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Setup mechanism based on type
            await this.setupMechanismByType(mechanism);

            // Save mechanism
            const mechanismPath = path.join(this.mechanismsPath, `${mechanism.id}.json`);
            await fs.writeFile(mechanismPath, JSON.stringify(mechanism, null, 2));

            await this.logRecoveryEvent('mechanism_setup', {
                mechanismId: mechanism.id,
                type: mechanism.type,
                timestamp: new Date().toISOString()
            });

            return mechanism;
        } catch (error) {
            console.error(`Failed to setup recovery mechanism ${type}:`, error);
            throw new Error(`Failed to setup recovery mechanism: ${error}`);
        }
    }

    // Setup mechanism-specific configuration
    private async setupMechanismByType(mechanism: RecoveryMechanism): Promise<void> {
        switch (mechanism.type) {
            case 'master_password_reset':
                await this.setupMasterPasswordReset(mechanism);
                break;
            case 'social_recovery':
                await this.setupSocialRecovery(mechanism);
                break;
            case 'legal_recovery':
                await this.setupLegalRecovery(mechanism);
                break;
            case 'emergency_codes':
                await this.setupEmergencyCodes(mechanism);
                break;
            case 'hardware_token':
                await this.setupHardwareToken(mechanism);
                break;
            case 'biometric':
                await this.setupBiometric(mechanism);
                break;
            case 'backup_restoration':
                await this.setupBackupRestoration(mechanism);
                break;
            default:
                throw new Error(`Unsupported recovery mechanism type: ${mechanism.type}`);
        }
        
        mechanism.isSetup = true;
        mechanism.updatedAt = new Date().toISOString();
    }

    // Setup master password reset
    private async setupMasterPasswordReset(mechanism: RecoveryMechanism): Promise<void> {
        const config = mechanism.configuration;
        
        // Create security questions if provided
        if (config.securityQuestions) {
            const questions: SecurityQuestion[] = [];
            for (const q of config.securityQuestions) {
                const salt = crypto.randomBytes(32).toString('hex');
                const answerHash = crypto.pbkdf2Sync(q.answer.toLowerCase(), salt, 100000, 64, 'sha512').toString('hex');
                
                questions.push({
                    id: uuidv4(),
                    question: q.question,
                    answerHash,
                    salt,
                    iterations: 100000,
                    isActive: true,
                    createdAt: new Date().toISOString()
                });
            }
            
            config.securityQuestions = questions;
        }
    }

    // Setup social recovery
    private async setupSocialRecovery(mechanism: RecoveryMechanism): Promise<void> {
        const config = mechanism.configuration;
        
        // Generate verification codes for trusted contacts
        if (config.trustedContacts) {
            for (const contact of config.trustedContacts) {
                if (!contact.verificationCode) {
                    contact.verificationCode = crypto.randomBytes(16).toString('hex');
                }
                contact.isVerified = false;
                contact.emergencyPriority = contact.emergencyPriority || 1;
                contact.permissions = contact.permissions || [];
                contact.createdAt = new Date().toISOString();
            }
        }

        // Set default approval requirements
        if (!config.requiredApprovals && config.trustedContacts) {
            config.requiredApprovals = Math.max(1, Math.floor(config.trustedContacts.length / 2));
        }
        
        config.timeDelay = config.timeDelay || 24; // Default 24 hour delay
    }

    // Setup legal recovery
    private async setupLegalRecovery(mechanism: RecoveryMechanism): Promise<void> {
        const config = mechanism.configuration;
        
        // Process legal documents
        if (config.legalDocuments) {
            for (const doc of config.legalDocuments) {
                if (!doc.documentHash && doc.attachedFile) {
                    // Calculate document hash (in real implementation would hash the actual file)
                    doc.documentHash = crypto.createHash('sha256').update(doc.attachedFile).digest('hex');
                }
                doc.createdAt = new Date().toISOString();
            }
        }

        // Setup authorized persons
        if (config.authorizedPersons) {
            for (const person of config.authorizedPersons) {
                person.createdAt = new Date().toISOString();
                person.authority = person.authority || ['emergency_access_only'];
            }
        }
    }

    // Setup emergency codes
    private async setupEmergencyCodes(mechanism: RecoveryMechanism): Promise<void> {
        const config = mechanism.configuration;
        const recoveryConfig = await this.getConfiguration();
        
        const codeCount = recoveryConfig.emergencySettings.codeCount;
        const codeLength = recoveryConfig.emergencySettings.codeLength;
        const codes: RecoveryCode[] = [];
        
        for (let i = 0; i < codeCount; i++) {
            const code = crypto.randomBytes(codeLength).toString('hex').toUpperCase();
            codes.push({
                id: uuidv4(),
                code,
                purpose: 'emergency_access',
                isUsed: false,
                expiresAt: new Date(Date.now() + recoveryConfig.emergencySettings.codeExpiration * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date().toISOString()
            });
        }
        
        config.recoveryCodes = codes;
        config.codesRemaining = codeCount;
    }

    // Setup hardware token
    private async setupHardwareToken(mechanism: RecoveryMechanism): Promise<void> {
        const config = mechanism.configuration;
        
        // Mock hardware token setup
        config.tokenSerial = config.tokenSerial || crypto.randomBytes(8).toString('hex').toUpperCase();
        config.backupTokens = config.backupTokens || [
            crypto.randomBytes(8).toString('hex').toUpperCase(),
            crypto.randomBytes(8).toString('hex').toUpperCase()
        ];
    }

    // Setup biometric recovery
    private async setupBiometric(mechanism: RecoveryMechanism): Promise<void> {
        const config = mechanism.configuration;
        
        // Mock biometric template storage
        if (config.biometricTypes && config.biometricTypes.length > 0) {
            const templates: BiometricTemplate[] = [];
            
            for (const type of config.biometricTypes) {
                templates.push({
                    id: uuidv4(),
                    type,
                    templateData: crypto.randomBytes(256).toString('base64'), // Mock encrypted template
                    quality: 85,
                    enrolledAt: new Date().toISOString(),
                    isActive: true
                });
            }
            
            config.biometricTemplates = templates;
        }
    }

    // Setup backup restoration recovery
    private async setupBackupRestoration(mechanism: RecoveryMechanism): Promise<void> {
        // This mechanism relies on the backup system
        // Configuration will link to available backup providers
        const config = mechanism.configuration;
        config.allowPartialRecovery = config.allowPartialRecovery ?? true;
        config.requireTwoFactor = config.requireTwoFactor ?? true;
    }

    // Initiate recovery attempt
    async initiateRecovery(type: RecoveryType, initiator: string, metadata: Record<string, any> = {}): Promise<RecoveryAttempt> {
        try {
            const attemptId = uuidv4();
            const riskScore = await this.calculateRiskScore(type, initiator, metadata);
            
            const attempt: RecoveryAttempt = {
                id: attemptId,
                type,
                initiatedBy: initiator,
                status: 'initiated',
                startedAt: new Date().toISOString(),
                verificationSteps: [],
                approvals: [],
                auditLog: [],
                riskScore,
                requiresManualReview: riskScore > 60,
                metadata
            };

            // Create verification steps based on mechanism type
            attempt.verificationSteps = await this.createVerificationSteps(type, attempt);

            // Save attempt
            const attemptPath = path.join(this.attemptsPath, `${attemptId}.json`);
            await fs.writeFile(attemptPath, JSON.stringify(attempt, null, 2));

            // Log audit entry
            await this.addAuditEntry(attempt, 'recovery_initiated', {
                type,
                riskScore,
                initiator
            });

            await this.logRecoveryEvent('recovery_attempt_initiated', {
                attemptId,
                type,
                riskScore,
                initiator
            });

            return attempt;
        } catch (error) {
            console.error('Failed to initiate recovery:', error);
            throw new Error(`Failed to initiate recovery: ${error}`);
        }
    }

    // Process recovery verification step
    async processVerificationStep(
        attemptId: string, 
        stepId: string, 
        data: Record<string, any>
    ): Promise<RecoveryAttempt> {
        try {
            const attempt = await this.getRecoveryAttempt(attemptId);
            const step = attempt.verificationSteps.find(s => s.id === stepId);
            
            if (!step) {
                throw new Error('Verification step not found');
            }

            if (step.status !== 'pending') {
                throw new Error('Verification step is not pending');
            }

            step.startedAt = new Date().toISOString();
            const verified = await this.verifyStep(step, data, attempt);
            
            if (verified) {
                step.status = 'completed';
                step.completedAt = new Date().toISOString();
                step.data = data;
            } else {
                step.status = 'failed';
                step.retryCount++;
                step.failureReason = 'Verification failed';
                
                if (step.retryCount >= 3) {
                    attempt.status = 'failed';
                    attempt.failureReason = 'Maximum verification attempts exceeded';
                }
            }

            // Check if all steps are completed
            if (attempt.verificationSteps.every(s => s.status === 'completed')) {
                attempt.status = 'verification_pending';
                
                // Check if approvals are needed
                if (attempt.approvals.length > 0) {
                    attempt.status = 'approval_pending';
                }
            }

            await this.saveRecoveryAttempt(attempt);
            await this.addAuditEntry(attempt, 'verification_step_processed', {
                stepId,
                stepType: step.type,
                verified
            });

            return attempt;
        } catch (error) {
            console.error('Failed to process verification step:', error);
            throw new Error(`Failed to process verification step: ${error}`);
        }
    }

    // Complete recovery process
    async completeRecovery(attemptId: string): Promise<boolean> {
        try {
            const attempt = await this.getRecoveryAttempt(attemptId);
            
            if (attempt.status !== 'in_progress') {
                throw new Error('Recovery attempt is not in progress');
            }

            // Verify all steps are completed
            const allStepsCompleted = attempt.verificationSteps.every(s => s.status === 'completed');
            const allApprovalsGranted = attempt.approvals.every(a => a.status === 'approved');

            if (!allStepsCompleted || !allApprovalsGranted) {
                throw new Error('Recovery verification not complete');
            }

            // Execute recovery based on type
            const recoveryResult = await this.executeRecovery(attempt);
            
            if (recoveryResult) {
                attempt.status = 'completed';
                attempt.completedAt = new Date().toISOString();
                
                // Update mechanism success rate
                await this.updateMechanismSuccessRate(attempt.type, true);
            } else {
                attempt.status = 'failed';
                attempt.failureReason = 'Recovery execution failed';
                
                await this.updateMechanismSuccessRate(attempt.type, false);
            }

            await this.saveRecoveryAttempt(attempt);
            await this.addAuditEntry(attempt, 'recovery_completed', {
                success: recoveryResult,
                completedAt: attempt.completedAt
            });

            return recoveryResult;
        } catch (error) {
            console.error('Failed to complete recovery:', error);
            throw new Error(`Failed to complete recovery: ${error}`);
        }
    }

    // Get recovery statistics
    async getRecoveryStatistics(): Promise<RecoveryStatistics> {
        try {
            const attempts = await this.getAllRecoveryAttempts();
            const totalAttempts = attempts.length;
            const successfulRecoveries = attempts.filter(a => a.status === 'completed').length;
            const failedAttempts = attempts.filter(a => a.status === 'failed').length;

            // Calculate average recovery time
            const completedAttempts = attempts.filter(a => a.completedAt);
            const averageRecoveryTime = completedAttempts.length > 0
                ? completedAttempts.reduce((sum, attempt) => {
                    const duration = new Date(attempt.completedAt!).getTime() - new Date(attempt.startedAt).getTime();
                    return sum + (duration / (1000 * 60 * 60)); // Convert to hours
                }, 0) / completedAttempts.length
                : 0;

            // Most used method
            const methodCounts = attempts.reduce((counts, attempt) => {
                counts[attempt.type] = (counts[attempt.type] || 0) + 1;
                return counts;
            }, {} as Record<RecoveryType, number>);
            
            const mostUsedMethod = Object.entries(methodCounts)
                .sort(([,a], [,b]) => b - a)[0]?.[0] as RecoveryType || 'master_password_reset';

            // Risk distribution
            const riskDistribution = attempts.reduce((dist, attempt) => {
                if (attempt.riskScore <= 30) dist.low++;
                else if (attempt.riskScore <= 60) dist.medium++;
                else if (attempt.riskScore <= 85) dist.high++;
                else dist.critical++;
                return dist;
            }, { low: 0, medium: 0, high: 0, critical: 0 });

            return {
                totalAttempts,
                successfulRecoveries,
                failedAttempts,
                averageRecoveryTime,
                mostUsedMethod,
                riskDistribution,
                monthlyStats: {} // Would implement monthly statistics
            };
        } catch (error) {
            console.error('Failed to get recovery statistics:', error);
            throw new Error('Failed to get recovery statistics');
        }
    }

    // Helper methods
    private getRecoveryMechanismName(type: RecoveryType): string {
        const names: Record<RecoveryType, string> = {
            'master_password_reset': 'Master Password Reset',
            'social_recovery': 'Social Recovery',
            'legal_recovery': 'Legal Recovery',
            'emergency_codes': 'Emergency Recovery Codes',
            'hardware_token': 'Hardware Token Recovery',
            'biometric': 'Biometric Recovery',
            'backup_restoration': 'Backup Restoration',
            'support_recovery': 'Support-Assisted Recovery'
        };
        return names[type];
    }

    private getRecoveryMechanismDescription(type: RecoveryType): string {
        const descriptions: Record<RecoveryType, string> = {
            'master_password_reset': 'Reset master password using security questions and alternate contact methods',
            'social_recovery': 'Recover access through verification by trusted contacts',
            'legal_recovery': 'Legal-based recovery through authorized persons and documentation',
            'emergency_codes': 'One-time use emergency codes for immediate access',
            'hardware_token': 'Hardware security key-based recovery',
            'biometric': 'Biometric authentication for account recovery',
            'backup_restoration': 'Account recovery through encrypted backup restoration',
            'support_recovery': 'Manual recovery process with support team assistance'
        };
        return descriptions[type];
    }

    private async getNextPriority(): Promise<number> {
        try {
            const mechanisms = await this.getAllMechanisms();
            return mechanisms.length > 0 ? Math.max(...mechanisms.map(m => m.priority)) + 1 : 1;
        } catch {
            return 1;
        }
    }

    private async getAllMechanisms(): Promise<RecoveryMechanism[]> {
        try {
            const files = await fs.readdir(this.mechanismsPath);
            const mechanisms: RecoveryMechanism[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const mechanismData = await fs.readFile(path.join(this.mechanismsPath, file), 'utf-8');
                    mechanisms.push(JSON.parse(mechanismData));
                }
            }

            return mechanisms.sort((a, b) => a.priority - b.priority);
        } catch {
            return [];
        }
    }

    private async getAllRecoveryAttempts(): Promise<RecoveryAttempt[]> {
        try {
            const files = await fs.readdir(this.attemptsPath);
            const attempts: RecoveryAttempt[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const attemptData = await fs.readFile(path.join(this.attemptsPath, file), 'utf-8');
                    attempts.push(JSON.parse(attemptData));
                }
            }

            return attempts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        } catch {
            return [];
        }
    }

    private async getRecoveryAttempt(attemptId: string): Promise<RecoveryAttempt> {
        try {
            const attemptPath = path.join(this.attemptsPath, `${attemptId}.json`);
            const attemptData = await fs.readFile(attemptPath, 'utf-8');
            return JSON.parse(attemptData);
        } catch (error) {
            throw new Error(`Recovery attempt not found: ${attemptId}`);
        }
    }

    private async saveRecoveryAttempt(attempt: RecoveryAttempt): Promise<void> {
        const attemptPath = path.join(this.attemptsPath, `${attempt.id}.json`);
        await fs.writeFile(attemptPath, JSON.stringify(attempt, null, 2));
    }

    private async calculateRiskScore(type: RecoveryType, initiator: string, metadata: Record<string, any>): Promise<number> {
        let riskScore = 0;

        // Base risk by recovery type
        const typeRisk: Record<RecoveryType, number> = {
            'emergency_codes': 20,
            'biometric': 25,
            'hardware_token': 30,
            'master_password_reset': 40,
            'backup_restoration': 45,
            'social_recovery': 50,
            'legal_recovery': 35,
            'support_recovery': 60
        };

        riskScore += typeRisk[type] || 50;

        // Add risk factors based on metadata
        if (metadata.unknownLocation) riskScore += 20;
        if (metadata.newDevice) riskScore += 15;
        if (metadata.unusualTime) riskScore += 10;
        if (metadata.previousFailures) riskScore += metadata.previousFailures * 5;

        return Math.min(100, Math.max(0, riskScore));
    }

    private async createVerificationSteps(type: RecoveryType, attempt: RecoveryAttempt): Promise<RecoveryVerificationStep[]> {
        const steps: RecoveryVerificationStep[] = [];

        switch (type) {
            case 'master_password_reset':
                steps.push({
                    id: uuidv4(),
                    type: 'security_questions',
                    description: 'Answer security questions',
                    status: 'pending',
                    startedAt: new Date().toISOString(),
                    retryCount: 0
                });
                steps.push({
                    id: uuidv4(),
                    type: 'alternate_email',
                    description: 'Verify alternate email address',
                    status: 'pending',
                    startedAt: new Date().toISOString(),
                    retryCount: 0
                });
                break;

            case 'social_recovery':
                steps.push({
                    id: uuidv4(),
                    type: 'trusted_contact_verification',
                    description: 'Verify identity with trusted contacts',
                    status: 'pending',
                    startedAt: new Date().toISOString(),
                    retryCount: 0
                });
                break;

            case 'emergency_codes':
                steps.push({
                    id: uuidv4(),
                    type: 'emergency_code',
                    description: 'Provide valid emergency code',
                    status: 'pending',
                    startedAt: new Date().toISOString(),
                    retryCount: 0
                });
                break;

            default:
                steps.push({
                    id: uuidv4(),
                    type: 'manual_verification',
                    description: 'Manual verification required',
                    status: 'pending',
                    startedAt: new Date().toISOString(),
                    retryCount: 0
                });
        }

        return steps;
    }

    private async verifyStep(step: RecoveryVerificationStep, data: Record<string, any>, attempt: RecoveryAttempt): Promise<boolean> {
        switch (step.type) {
            case 'security_questions':
                return this.verifySecurityQuestions(data);
            case 'alternate_email':
                return this.verifyAlternateEmail(data);
            case 'emergency_code':
                return this.verifyEmergencyCode(data);
            case 'trusted_contact_verification':
                return this.verifyTrustedContacts(data);
            default:
                return false;
        }
    }

    private async verifySecurityQuestions(data: Record<string, any>): Promise<boolean> {
        // Mock verification - would check against stored hashed answers
        return data.answers && Array.isArray(data.answers) && data.answers.length >= 2;
    }

    private async verifyAlternateEmail(data: Record<string, any>): Promise<boolean> {
        // Mock verification - would verify email ownership
        return data.emailVerificationCode && data.emailVerificationCode.length === 6;
    }

    private async verifyEmergencyCode(data: Record<string, any>): Promise<boolean> {
        // Mock verification - would check against stored codes
        return data.emergencyCode && data.emergencyCode.length === 24;
    }

    private async verifyTrustedContacts(data: Record<string, any>): Promise<boolean> {
        // Mock verification - would verify trusted contact approvals
        return data.contactApprovals && data.contactApprovals.length >= 2;
    }

    private async executeRecovery(attempt: RecoveryAttempt): Promise<boolean> {
        // Mock recovery execution - would perform actual recovery actions
        console.log(`Executing recovery for attempt ${attempt.id} of type ${attempt.type}`);
        
        // In real implementation would:
        // - Reset master password
        // - Generate new access tokens
        // - Restore from backup
        // - Notify relevant parties
        
        return true;
    }

    private async updateMechanismSuccessRate(type: RecoveryType, success: boolean): Promise<void> {
        try {
            const mechanisms = await this.getAllMechanisms();
            const mechanism = mechanisms.find(m => m.type === type);
            
            if (mechanism) {
                // Simple success rate calculation (would use more sophisticated tracking in production)
                const currentRate = mechanism.successRate;
                mechanism.successRate = success 
                    ? Math.min(100, currentRate + 1)
                    : Math.max(0, currentRate - 2);
                
                mechanism.lastUsed = new Date().toISOString();
                mechanism.updatedAt = new Date().toISOString();
                
                const mechanismPath = path.join(this.mechanismsPath, `${mechanism.id}.json`);
                await fs.writeFile(mechanismPath, JSON.stringify(mechanism, null, 2));
            }
        } catch (error) {
            console.error('Failed to update mechanism success rate:', error);
        }
    }

    private async addAuditEntry(attempt: RecoveryAttempt, action: string, details: Record<string, any>): Promise<void> {
        const auditEntry: RecoveryAuditEntry = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            action,
            performedBy: attempt.initiatedBy,
            details,
            riskLevel: attempt.riskScore > 60 ? 'high' : attempt.riskScore > 30 ? 'medium' : 'low'
        };

        attempt.auditLog.push(auditEntry);
    }

    private async logRecoveryEvent(eventType: string, details: any): Promise<void> {
        await auditLoggingService.logEvent({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            eventType: 'recovery_system',
            action: eventType,
            result: 'success',
            details,
            riskLevel: 'medium',
            hash: ''
        });
    }

    // Public API methods
    async getMechanisms(): Promise<RecoveryMechanism[]> {
        return this.getAllMechanisms();
    }

    async getAttempts(): Promise<RecoveryAttempt[]> {
        return this.getAllRecoveryAttempts();
    }

    async getAttempt(attemptId: string): Promise<RecoveryAttempt> {
        return this.getRecoveryAttempt(attemptId);
    }

    async deleteMechanism(mechanismId: string): Promise<boolean> {
        try {
            const mechanismPath = path.join(this.mechanismsPath, `${mechanismId}.json`);
            await fs.unlink(mechanismPath);
            
            await this.logRecoveryEvent('mechanism_deleted', {
                mechanismId,
                timestamp: new Date().toISOString()
            });
            
            return true;
        } catch (error) {
            console.error('Failed to delete recovery mechanism:', error);
            return false;
        }
    }
}

export const recoveryService = new RecoveryService();