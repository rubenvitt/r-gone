import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
    DeadManSwitch,
    DeadManSwitchSystem,
    DeadManSwitchConfig,
    DeadManSwitchStatus,
    DeadManSwitchEventType,
    DeadManSwitchAuditEntry,
    CheckInMethod,
    CheckInType,
    WarningRecord,
    NotificationMethod,
    HolidayMode,
    EmergencyContact,
    DeadManSwitchGlobalSettings,
    MonitoringServiceConfig,
    DeadManSwitchStatistics,
    ActivationBehavior,
    WarningSchedule,
    ReactivationMethod
} from '../types/data';
import { auditLoggingService } from './audit-logging-service';

class DeadManSwitchService {
    private dataPath = path.join(process.cwd(), 'data', 'dead-man-switch');
    private configPath = path.join(this.dataPath, 'dead-man-switch-config.json');
    private systemDataPath = path.join(this.dataPath, 'dead-man-switch-system.json');
    private monitoringInterval?: NodeJS.Timeout;

    constructor() {
        this.ensureDataDirectoryExists();
        this.initializeMonitoring();
    }

    private async ensureDataDirectoryExists(): Promise<void> {
        try {
            await fs.mkdir(this.dataPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create dead man switch data directory:', error);
        }
    }

    // Initialize the Dead Man's Switch system
    async initializeSystem(userId: string): Promise<DeadManSwitchSystem> {
        const defaultGlobalSettings: DeadManSwitchGlobalSettings = {
            enableSystem: true,
            defaultInactivityDays: 60,
            defaultGraceDays: 7,
            minInactivityDays: 30,
            maxInactivityDays: 365,
            enableTestMode: false,
            enableDetailedLogging: true,
            enableEmergencyOverride: true,
            globalEmergencyContacts: [],
            alertingConfiguration: {
                enableSystemAlerts: true,
                alertRecipients: [],
                alertOnErrors: true,
                alertOnActivations: true,
                alertOnLongInactivity: true
            },
            retentionPolicy: {
                keepAuditLogs: 365,
                keepWarningRecords: 180,
                keepStatistics: 90
            }
        };

        const defaultMonitoringConfig: MonitoringServiceConfig = {
            enabled: true,
            checkIntervalMinutes: 60, // Check every hour
            enableHealthChecks: true,
            healthCheckIntervalMinutes: 30,
            enableBackupMonitoring: false,
            enableRedundancy: false,
            notificationConfiguration: {
                enableServiceAlerts: true,
                alertRecipients: [],
                retryAttempts: 3,
                retryIntervalMinutes: 5
            }
        };

        const defaultStatistics: DeadManSwitchStatistics = {
            totalSwitches: 0,
            activeSwitches: 0,
            triggeredSwitches: 0,
            switchesByStatus: {
                'active': 0,
                'warning': 0,
                'grace': 0,
                'triggered': 0,
                'paused': 0,
                'disabled': 0,
                'error': 0,
                'testing': 0
            },
            averageInactivityPeriod: 60,
            totalWarningsSent: 0,
            warningResponseRate: 0,
            holidayModeUsage: 0,
            systemUptime: 100,
            lastMonitoringCheck: new Date().toISOString(),
            performanceMetrics: {
                averageCheckInProcessingTime: 0,
                averageWarningDeliveryTime: 0,
                systemErrors: 0
            }
        };

        const system: DeadManSwitchSystem = {
            switches: [],
            globalSettings: defaultGlobalSettings,
            monitoringService: defaultMonitoringConfig,
            statistics: defaultStatistics
        };

        await this.saveSystemData(system);
        await this.logAuditEvent('system_initialized', { userId }, userId);

        return system;
    }

    // Create a new Dead Man's Switch
    async createDeadManSwitch(
        userId: string,
        config: Partial<DeadManSwitchConfig> = {}
    ): Promise<DeadManSwitch> {
        const system = await this.getSystemData();
        
        const defaultConfig: DeadManSwitchConfig = {
            inactivityPeriodDays: system.globalSettings.defaultInactivityDays,
            gracePeriodDays: system.globalSettings.defaultGraceDays,
            warningSchedule: this.getDefaultWarningSchedule(),
            enableEarlyWarnings: true,
            enableFinalConfirmation: true,
            finalConfirmationHours: 24,
            reactivationMethod: 'secure_confirmation',
            activationBehavior: this.getDefaultActivationBehavior(),
            emergencyContacts: [],
            testMode: system.globalSettings.enableTestMode
        };

        const deadManSwitch: DeadManSwitch = {
            id: uuidv4(),
            isEnabled: true,
            configuration: { ...defaultConfig, ...config },
            status: 'active',
            lastActivity: new Date().toISOString(),
            nextCheck: this.calculateNextCheck(defaultConfig.inactivityPeriodDays),
            warningsSent: [],
            checkInMethods: this.getDefaultCheckInMethods(),
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: userId,
                lastModifiedBy: userId
            },
            auditTrail: []
        };

        system.switches.push(deadManSwitch);
        system.statistics.totalSwitches++;
        system.statistics.activeSwitches++;
        system.statistics.switchesByStatus.active++;

        await this.saveSystemData(system);
        await this.logAuditEvent('created', { switchId: deadManSwitch.id }, userId, deadManSwitch);

        return deadManSwitch;
    }

    // Record user activity (check-in)
    async recordActivity(
        switchId: string,
        userId: string,
        method: CheckInType,
        metadata?: Record<string, any>
    ): Promise<boolean> {
        const system = await this.getSystemData();
        const switchIndex = system.switches.findIndex(s => s.id === switchId);
        
        if (switchIndex === -1) {
            throw new Error('Dead Man Switch not found');
        }

        const deadManSwitch = system.switches[switchIndex];
        const now = new Date().toISOString();
        
        // Update last activity
        deadManSwitch.lastActivity = now;
        deadManSwitch.status = 'active';
        deadManSwitch.nextCheck = this.calculateNextCheck(
            deadManSwitch.configuration.inactivityPeriodDays
        );
        deadManSwitch.metadata.updatedAt = now;
        deadManSwitch.metadata.lastModifiedBy = userId;

        // Clear any existing warnings
        if (deadManSwitch.warningsSent.length > 0) {
            deadManSwitch.warningsSent = [];
        }

        // Update check-in method statistics
        const checkInMethod = deadManSwitch.checkInMethods.find(m => m.type === method);
        if (checkInMethod) {
            checkInMethod.lastUsed = now;
            checkInMethod.usageCount++;
            // Update reliability based on successful check-ins
            checkInMethod.reliability = Math.min(100, checkInMethod.reliability + 1);
        }

        // Deactivate holiday mode if active
        if (deadManSwitch.holidayMode?.isActive) {
            deadManSwitch.holidayMode.isActive = false;
        }

        system.switches[switchIndex] = deadManSwitch;
        await this.saveSystemData(system);

        await this.logAuditEvent('check_in', { 
            method, 
            metadata,
            previousStatus: deadManSwitch.status
        }, userId, deadManSwitch);

        return true;
    }

    // Activate holiday mode
    async activateHolidayMode(
        switchId: string,
        userId: string,
        startDate: string,
        endDate: string,
        reason?: string
    ): Promise<boolean> {
        const system = await this.getSystemData();
        const switchIndex = system.switches.findIndex(s => s.id === switchId);
        
        if (switchIndex === -1) {
            throw new Error('Dead Man Switch not found');
        }

        const deadManSwitch = system.switches[switchIndex];
        const maxDuration = 90; // Maximum 90 days holiday mode

        const holidayMode: HolidayMode = {
            isActive: true,
            startDate,
            endDate,
            reason,
            emergencyContactNotified: false,
            autoResume: true,
            maxDuration,
            activatedBy: userId,
            activatedAt: new Date().toISOString()
        };

        deadManSwitch.holidayMode = holidayMode;
        deadManSwitch.status = 'paused';
        deadManSwitch.metadata.updatedAt = new Date().toISOString();
        deadManSwitch.metadata.lastModifiedBy = userId;

        system.switches[switchIndex] = deadManSwitch;
        await this.saveSystemData(system);

        await this.logAuditEvent('holiday_activated', {
            startDate,
            endDate,
            reason,
            duration: this.calculateDaysDifference(startDate, endDate)
        }, userId, deadManSwitch);

        return true;
    }

    // Check all switches for inactivity
    async monitorSwitches(): Promise<void> {
        const system = await this.getSystemData();
        const now = new Date();

        for (const deadManSwitch of system.switches) {
            if (!deadManSwitch.isEnabled || deadManSwitch.status === 'disabled') {
                continue;
            }

            // Skip if in holiday mode and still valid
            if (deadManSwitch.holidayMode?.isActive) {
                const endDate = new Date(deadManSwitch.holidayMode.endDate);
                if (now <= endDate) {
                    continue;
                } else {
                    // Holiday mode expired, auto-resume
                    await this.deactivateHolidayMode(deadManSwitch.id, 'system');
                }
            }

            await this.checkSwitchStatus(deadManSwitch);
        }

        // Update monitoring statistics
        system.statistics.lastMonitoringCheck = now.toISOString();
        await this.saveSystemData(system);
    }

    // Check individual switch status
    private async checkSwitchStatus(deadManSwitch: DeadManSwitch): Promise<void> {
        const now = new Date();
        const lastActivity = new Date(deadManSwitch.lastActivity);
        const daysSinceActivity = Math.floor(
            (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        );

        const config = deadManSwitch.configuration;
        const totalInactivityDays = config.inactivityPeriodDays + config.gracePeriodDays;

        // Check if switch should be triggered
        if (daysSinceActivity >= totalInactivityDays) {
            await this.triggerDeadManSwitch(deadManSwitch.id);
            return;
        }

        // Check for warnings
        await this.processWarnings(deadManSwitch, daysSinceActivity);
    }

    // Process warning notifications
    private async processWarnings(
        deadManSwitch: DeadManSwitch,
        daysSinceActivity: number
    ): Promise<void> {
        const config = deadManSwitch.configuration;
        const daysUntilActivation = config.inactivityPeriodDays + config.gracePeriodDays - daysSinceActivity;

        for (const warningConfig of config.warningSchedule) {
            if (daysUntilActivation <= warningConfig.daysBeforeActivation) {
                // Check if warning already sent
                const warningAlreadySent = deadManSwitch.warningsSent.some(w => 
                    w.template === warningConfig.template && 
                    w.status !== 'failed'
                );

                if (!warningAlreadySent) {
                    await this.sendWarning(deadManSwitch, warningConfig);
                }
            }
        }
    }

    // Send warning notification
    private async sendWarning(
        deadManSwitch: DeadManSwitch,
        warningConfig: WarningSchedule
    ): Promise<void> {
        for (const method of warningConfig.methods) {
            if (!method.enabled) continue;

            const warningRecord: WarningRecord = {
                id: uuidv4(),
                sentAt: new Date().toISOString(),
                method,
                template: warningConfig.template,
                status: 'sent'
            };

            try {
                // Implement actual notification sending logic here
                await this.sendNotification(method, warningConfig.template, deadManSwitch);
                warningRecord.status = 'delivered';
            } catch (error) {
                warningRecord.status = 'failed';
                console.error('Failed to send warning:', error);
            }

            deadManSwitch.warningsSent.push(warningRecord);
        }

        deadManSwitch.status = 'warning';
        await this.logAuditEvent('warning_sent', {
            warningType: warningConfig.template,
            daysBeforeActivation: warningConfig.daysBeforeActivation
        }, 'system', deadManSwitch);
    }

    // Trigger the Dead Man's Switch
    async triggerDeadManSwitch(switchId: string): Promise<void> {
        const system = await this.getSystemData();
        const switchIndex = system.switches.findIndex(s => s.id === switchId);
        
        if (switchIndex === -1) {
            throw new Error('Dead Man Switch not found');
        }

        const deadManSwitch = system.switches[switchIndex];
        deadManSwitch.status = 'triggered';
        deadManSwitch.metadata.updatedAt = new Date().toISOString();

        // Implement activation behavior
        await this.executeActivationBehavior(deadManSwitch);

        system.switches[switchIndex] = deadManSwitch;
        system.statistics.triggeredSwitches++;
        system.statistics.switchesByStatus.triggered++;

        await this.saveSystemData(system);
        await this.logAuditEvent('triggered', { 
            activationBehavior: deadManSwitch.configuration.activationBehavior 
        }, 'system', deadManSwitch);
    }

    // Execute activation behavior
    private async executeActivationBehavior(deadManSwitch: DeadManSwitch): Promise<void> {
        const behavior = deadManSwitch.configuration.activationBehavior;

        // Notify beneficiaries immediately if configured
        if (behavior.notifyBeneficiariesImmediately) {
            await this.notifyBeneficiaries(deadManSwitch);
        }

        // Implement gradual activation if enabled
        if (behavior.enableGradualActivation && behavior.activationStages) {
            await this.scheduleGradualActivation(deadManSwitch, behavior.activationStages);
        }

        // Schedule full activation if configured
        if (behavior.enableFullActivation && behavior.fullActivationDelayHours) {
            await this.scheduleFullActivation(deadManSwitch, behavior.fullActivationDelayHours);
        }
    }

    // Helper methods
    private getDefaultWarningSchedule(): WarningSchedule[] {
        return [
            {
                daysBeforeActivation: 7,
                methods: [
                    { type: 'email', enabled: true, destination: '', priority: 1 }
                ],
                template: 'warning_7_days',
                requireResponse: true,
                escalationAfterHours: 24
            },
            {
                daysBeforeActivation: 3,
                methods: [
                    { type: 'email', enabled: true, destination: '', priority: 1 },
                    { type: 'sms', enabled: true, destination: '', priority: 2 }
                ],
                template: 'warning_3_days',
                requireResponse: true,
                escalationAfterHours: 12
            },
            {
                daysBeforeActivation: 1,
                methods: [
                    { type: 'email', enabled: true, destination: '', priority: 1 },
                    { type: 'sms', enabled: true, destination: '', priority: 2 },
                    { type: 'phone_call', enabled: false, destination: '', priority: 3 }
                ],
                template: 'final_warning',
                requireResponse: true,
                escalationAfterHours: 6
            }
        ];
    }

    private getDefaultActivationBehavior(): ActivationBehavior {
        return {
            enableGradualActivation: true,
            activationStages: [
                {
                    stage: 1,
                    delayHours: 0,
                    accessLevels: ['emergency'],
                    resourceTypes: ['emergencyInfo'],
                    notificationRecipients: []
                },
                {
                    stage: 2,
                    delayHours: 24,
                    accessLevels: ['limited'],
                    resourceTypes: ['contact', 'emergencyInfo'],
                    notificationRecipients: []
                },
                {
                    stage: 3,
                    delayHours: 72,
                    accessLevels: ['full'],
                    resourceTypes: ['document', 'note', 'password', 'contact'],
                    notificationRecipients: []
                }
            ],
            enableFullActivation: true,
            fullActivationDelayHours: 168, // 7 days
            enableRollback: true,
            rollbackWindowHours: 48,
            notifyBeneficiariesImmediately: true,
            enableEmergencyOverride: true
        };
    }

    private getDefaultCheckInMethods(): CheckInMethod[] {
        return [
            {
                type: 'app_login',
                enabled: true,
                configuration: { minFrequencyDays: 1 },
                usageCount: 0,
                reliability: 95
            },
            {
                type: 'email_response',
                enabled: true,
                configuration: { requireSecureContext: true },
                usageCount: 0,
                reliability: 90
            },
            {
                type: 'web_checkin',
                enabled: true,
                configuration: { requireSecureContext: true },
                usageCount: 0,
                reliability: 85
            }
        ];
    }

    private calculateNextCheck(inactivityDays: number): string {
        const nextCheck = new Date();
        nextCheck.setDate(nextCheck.getDate() + inactivityDays);
        return nextCheck.toISOString();
    }

    private calculateDaysDifference(startDate: string, endDate: string): number {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Send notification using notification service
    private async sendNotification(
        method: NotificationMethod,
        template: string,
        deadManSwitch: DeadManSwitch
    ): Promise<void> {
        const { notificationService } = await import('./notification-service');
        
        // Calculate days until activation
        const now = new Date();
        const lastActivity = new Date(deadManSwitch.lastActivity);
        const config = deadManSwitch.configuration;
        const totalDays = config.inactivityPeriodDays + config.gracePeriodDays;
        const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilActivation = totalDays - daysSinceActivity;

        // Generate template variables
        const variables = notificationService.generateTemplateVariables(deadManSwitch, daysUntilActivation);

        // Send notification
        await notificationService.sendNotification(method, template, deadManSwitch, variables);
    }

    private async notifyBeneficiaries(deadManSwitch: DeadManSwitch): Promise<void> {
        // TODO: Implement beneficiary notification
        console.log('Notifying beneficiaries of activation');
    }

    private async scheduleGradualActivation(
        deadManSwitch: DeadManSwitch,
        stages: any[]
    ): Promise<void> {
        // TODO: Implement gradual activation scheduling
        console.log('Scheduling gradual activation');
    }

    private async scheduleFullActivation(
        deadManSwitch: DeadManSwitch,
        delayHours: number
    ): Promise<void> {
        // TODO: Implement full activation scheduling
        console.log(`Scheduling full activation in ${delayHours} hours`);
    }

    private async deactivateHolidayMode(switchId: string, userId: string): Promise<void> {
        const system = await this.getSystemData();
        const switchIndex = system.switches.findIndex(s => s.id === switchId);
        
        if (switchIndex !== -1) {
            const deadManSwitch = system.switches[switchIndex];
            if (deadManSwitch.holidayMode) {
                deadManSwitch.holidayMode.isActive = false;
                deadManSwitch.status = 'active';
                deadManSwitch.metadata.updatedAt = new Date().toISOString();
                deadManSwitch.metadata.lastModifiedBy = userId;
                
                system.switches[switchIndex] = deadManSwitch;
                await this.saveSystemData(system);
                
                await this.logAuditEvent('holiday_deactivated', {
                    reason: 'auto_expired'
                }, userId, deadManSwitch);
            }
        }
    }

    // Data persistence methods
    private async getSystemData(): Promise<DeadManSwitchSystem> {
        try {
            const data = await fs.readFile(this.systemDataPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            // Initialize system if no data exists
            return await this.initializeSystem('system');
        }
    }

    private async saveSystemData(system: DeadManSwitchSystem): Promise<void> {
        await fs.writeFile(this.systemDataPath, JSON.stringify(system, null, 2));
    }

    private async logAuditEvent(
        eventType: DeadManSwitchEventType,
        details: Record<string, any>,
        performedBy: string,
        deadManSwitch?: DeadManSwitch
    ): Promise<void> {
        const auditEntry: DeadManSwitchAuditEntry = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            eventType,
            details,
            performedBy,
            // Only include essential state info to avoid circular references
            newState: deadManSwitch ? {
                id: deadManSwitch.id,
                status: deadManSwitch.status,
                isEnabled: deadManSwitch.isEnabled,
                lastActivity: deadManSwitch.lastActivity,
                nextCheck: deadManSwitch.nextCheck
            } : undefined
        };

        if (deadManSwitch) {
            deadManSwitch.auditTrail.push(auditEntry);
        }

        // Also log to main audit system
        await auditLoggingService.logEvent({
            id: auditEntry.id,
            timestamp: auditEntry.timestamp,
            eventType: 'system_access',
            userId: performedBy,
            action: `dead_man_switch_${eventType}`,
            result: 'success',
            details: {
                switchId: deadManSwitch?.id,
                ...details
            },
            riskLevel: eventType === 'triggered' ? 'critical' : 'low',
            hash: ''
        });
    }

    // Initialize monitoring service
    private initializeMonitoring(): void {
        // Check every hour for switch status
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.monitorSwitches();
            } catch (error) {
                console.error('Error during Dead Man Switch monitoring:', error);
            }
        }, 60 * 60 * 1000); // 1 hour
    }

    // Cleanup monitoring on service shutdown
    public destroy(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }

    // Public API methods
    async getDeadManSwitch(switchId: string): Promise<DeadManSwitch | null> {
        const system = await this.getSystemData();
        return system.switches.find(s => s.id === switchId) || null;
    }

    async getAllSwitches(): Promise<DeadManSwitch[]> {
        const system = await this.getSystemData();
        return system.switches;
    }

    async updateSwitchConfiguration(
        switchId: string,
        userId: string,
        updates: Partial<DeadManSwitchConfig>
    ): Promise<DeadManSwitch> {
        const system = await this.getSystemData();
        const switchIndex = system.switches.findIndex(s => s.id === switchId);
        
        if (switchIndex === -1) {
            throw new Error('Dead Man Switch not found');
        }

        const deadManSwitch = system.switches[switchIndex];
        const oldConfig = { ...deadManSwitch.configuration };
        
        deadManSwitch.configuration = { ...deadManSwitch.configuration, ...updates };
        deadManSwitch.metadata.updatedAt = new Date().toISOString();
        deadManSwitch.metadata.lastModifiedBy = userId;

        // Recalculate next check if inactivity period changed
        if (updates.inactivityPeriodDays) {
            deadManSwitch.nextCheck = this.calculateNextCheck(updates.inactivityPeriodDays);
        }

        system.switches[switchIndex] = deadManSwitch;
        await this.saveSystemData(system);

        await this.logAuditEvent('config_updated', {
            oldConfig,
            newConfig: deadManSwitch.configuration,
            changes: updates
        }, userId, deadManSwitch);

        return deadManSwitch;
    }

    async disableSwitch(switchId: string, userId: string): Promise<boolean> {
        const system = await this.getSystemData();
        const switchIndex = system.switches.findIndex(s => s.id === switchId);
        
        if (switchIndex === -1) {
            throw new Error('Dead Man Switch not found');
        }

        const deadManSwitch = system.switches[switchIndex];
        deadManSwitch.isEnabled = false;
        deadManSwitch.status = 'disabled';
        deadManSwitch.metadata.updatedAt = new Date().toISOString();
        deadManSwitch.metadata.lastModifiedBy = userId;

        system.switches[switchIndex] = deadManSwitch;
        system.statistics.activeSwitches--;
        system.statistics.switchesByStatus.disabled++;

        await this.saveSystemData(system);
        await this.logAuditEvent('disabled', {}, userId, deadManSwitch);

        return true;
    }

    async enableSwitch(switchId: string, userId: string): Promise<boolean> {
        const system = await this.getSystemData();
        const switchIndex = system.switches.findIndex(s => s.id === switchId);
        
        if (switchIndex === -1) {
            throw new Error('Dead Man Switch not found');
        }

        const deadManSwitch = system.switches[switchIndex];
        deadManSwitch.isEnabled = true;
        deadManSwitch.status = 'active';
        deadManSwitch.lastActivity = new Date().toISOString();
        deadManSwitch.nextCheck = this.calculateNextCheck(
            deadManSwitch.configuration.inactivityPeriodDays
        );
        deadManSwitch.metadata.updatedAt = new Date().toISOString();
        deadManSwitch.metadata.lastModifiedBy = userId;

        system.switches[switchIndex] = deadManSwitch;
        system.statistics.activeSwitches++;
        system.statistics.switchesByStatus.active++;

        await this.saveSystemData(system);
        await this.logAuditEvent('enabled', {}, userId, deadManSwitch);

        return true;
    }
}

export const deadManSwitchService = new DeadManSwitchService();