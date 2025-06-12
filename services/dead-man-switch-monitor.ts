import { deadManSwitchService } from './dead-man-switch-service';
import { auditLoggingService } from './audit-logging-service';

interface MonitoringConfig {
    enabled: boolean;
    checkIntervalMinutes: number;
    healthCheckIntervalMinutes: number;
    enableAutoRecovery: boolean;
    maxConsecutiveErrors: number;
    alertOnErrors: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface MonitoringStats {
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    lastCheckTime: string;
    lastSuccessTime: string;
    lastErrorTime?: string;
    consecutiveErrors: number;
    uptime: number; // percentage
    averageCheckDuration: number; // milliseconds
}

class DeadManSwitchMonitor {
    private config: MonitoringConfig;
    private stats: MonitoringStats;
    private monitoringInterval?: NodeJS.Timeout;
    private healthCheckInterval?: NodeJS.Timeout;
    private isRunning = false;
    private startTime: Date;

    constructor() {
        this.config = {
            enabled: true,
            checkIntervalMinutes: 60, // Check every hour
            healthCheckIntervalMinutes: 30, // Health check every 30 minutes
            enableAutoRecovery: true,
            maxConsecutiveErrors: 5,
            alertOnErrors: true,
            logLevel: 'info'
        };

        this.stats = {
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            lastCheckTime: new Date().toISOString(),
            lastSuccessTime: new Date().toISOString(),
            consecutiveErrors: 0,
            uptime: 100,
            averageCheckDuration: 0
        };

        this.startTime = new Date();
        this.loadConfig();
    }

    // Load configuration from file or environment
    private async loadConfig(): Promise<void> {
        try {
            // Load from environment variables if available
            const envConfig = {
                enabled: process.env.DMS_MONITOR_ENABLED !== 'false',
                checkIntervalMinutes: parseInt(process.env.DMS_CHECK_INTERVAL_MINUTES || '60'),
                healthCheckIntervalMinutes: parseInt(process.env.DMS_HEALTH_CHECK_INTERVAL_MINUTES || '30'),
                enableAutoRecovery: process.env.DMS_AUTO_RECOVERY !== 'false',
                maxConsecutiveErrors: parseInt(process.env.DMS_MAX_CONSECUTIVE_ERRORS || '5'),
                alertOnErrors: process.env.DMS_ALERT_ON_ERRORS !== 'false',
                logLevel: (process.env.DMS_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error'
            };

            this.config = { ...this.config, ...envConfig };
            this.log('info', 'Configuration loaded', this.config);
        } catch (error) {
            this.log('error', 'Failed to load configuration', error);
        }
    }

    // Start the monitoring service
    async start(): Promise<void> {
        if (this.isRunning) {
            this.log('warn', 'Monitor is already running');
            return;
        }

        if (!this.config.enabled) {
            this.log('info', 'Monitor is disabled by configuration');
            return;
        }

        this.log('info', 'Starting Dead Man\'s Switch monitor');
        this.isRunning = true;
        this.startTime = new Date();

        // Start main monitoring loop
        this.monitoringInterval = setInterval(
            () => this.performMonitoringCheck(),
            this.config.checkIntervalMinutes * 60 * 1000
        );

        // Start health check loop
        this.healthCheckInterval = setInterval(
            () => this.performHealthCheck(),
            this.config.healthCheckIntervalMinutes * 60 * 1000
        );

        // Perform initial check
        await this.performMonitoringCheck();

        // Log startup
        await this.logAuditEvent('monitor_started', {
            config: this.config,
            startTime: this.startTime.toISOString()
        });

        this.log('info', 'Dead Man\'s Switch monitor started successfully');
    }

    // Stop the monitoring service
    async stop(): Promise<void> {
        if (!this.isRunning) {
            this.log('warn', 'Monitor is not running');
            return;
        }

        this.log('info', 'Stopping Dead Man\'s Switch monitor');
        this.isRunning = false;

        // Clear intervals
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }

        // Log shutdown
        await this.logAuditEvent('monitor_stopped', {
            uptime: this.calculateUptime(),
            stats: this.stats,
            stopTime: new Date().toISOString()
        });

        this.log('info', 'Dead Man\'s Switch monitor stopped');
    }

    // Perform monitoring check
    private async performMonitoringCheck(): Promise<void> {
        const checkStartTime = Date.now();
        this.stats.totalChecks++;
        this.stats.lastCheckTime = new Date().toISOString();

        try {
            this.log('debug', 'Starting monitoring check');
            
            // Perform the actual monitoring
            await deadManSwitchService.monitorSwitches();
            
            // Update success statistics
            this.stats.successfulChecks++;
            this.stats.lastSuccessTime = new Date().toISOString();
            this.stats.consecutiveErrors = 0;
            
            // Calculate check duration
            const checkDuration = Date.now() - checkStartTime;
            this.updateAverageCheckDuration(checkDuration);
            
            this.log('debug', `Monitoring check completed in ${checkDuration}ms`);
            
        } catch (error) {
            // Handle monitoring error
            this.stats.failedChecks++;
            this.stats.consecutiveErrors++;
            this.stats.lastErrorTime = new Date().toISOString();
            
            this.log('error', 'Monitoring check failed', error);
            
            // Alert if too many consecutive errors
            if (this.stats.consecutiveErrors >= this.config.maxConsecutiveErrors) {
                await this.handleCriticalError(error);
            }
            
            // Log audit event for error
            await this.logAuditEvent('monitor_error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                consecutiveErrors: this.stats.consecutiveErrors,
                checkDuration: Date.now() - checkStartTime
            });
        }

        // Update uptime calculation
        this.updateUptime();
    }

    // Perform health check
    private async performHealthCheck(): Promise<void> {
        try {
            this.log('debug', 'Performing health check');
            
            // Check if monitor is responsive
            const healthCheckStart = Date.now();
            
            // Basic health indicators
            const health = {
                isRunning: this.isRunning,
                uptime: this.calculateUptime(),
                consecutiveErrors: this.stats.consecutiveErrors,
                lastSuccessAge: Date.now() - new Date(this.stats.lastSuccessTime).getTime(),
                memoryUsage: process.memoryUsage(),
                timestamp: new Date().toISOString()
            };

            // Check if last success was too long ago (more than 2 check intervals)
            const maxSuccessAge = this.config.checkIntervalMinutes * 2 * 60 * 1000;
            if (health.lastSuccessAge > maxSuccessAge) {
                this.log('warn', 'Last successful check was too long ago', health);
                
                if (this.config.enableAutoRecovery) {
                    await this.attemptAutoRecovery();
                }
            }

            // Check for high error rate
            const errorRate = this.stats.totalChecks > 0 ? this.stats.failedChecks / this.stats.totalChecks : 0;
            if (errorRate > 0.2) { // More than 20% error rate
                this.log('warn', `High error rate detected: ${(errorRate * 100).toFixed(1)}%`, health);
            }

            this.log('debug', `Health check completed in ${Date.now() - healthCheckStart}ms`, health);
            
        } catch (error) {
            this.log('error', 'Health check failed', error);
        }
    }

    // Handle critical error situation
    private async handleCriticalError(error: any): Promise<void> {
        const alertData = {
            error: error instanceof Error ? error.message : 'Unknown error',
            consecutiveErrors: this.stats.consecutiveErrors,
            lastSuccessTime: this.stats.lastSuccessTime,
            uptime: this.calculateUptime(),
            stats: this.stats
        };

        this.log('error', 'Critical error threshold reached', alertData);

        // Log critical audit event
        await this.logAuditEvent('monitor_critical_error', alertData);

        // Attempt auto-recovery if enabled
        if (this.config.enableAutoRecovery) {
            await this.attemptAutoRecovery();
        }

        // TODO: Send alert notifications to administrators
        if (this.config.alertOnErrors) {
            await this.sendCriticalAlert(alertData);
        }
    }

    // Attempt to recover from errors
    private async attemptAutoRecovery(): Promise<void> {
        this.log('info', 'Attempting auto-recovery');
        
        try {
            // Reset error counters
            this.stats.consecutiveErrors = 0;
            
            // Restart monitoring if needed
            if (!this.isRunning) {
                await this.start();
            }
            
            // Force a monitoring check
            await this.performMonitoringCheck();
            
            this.log('info', 'Auto-recovery completed successfully');
            
            await this.logAuditEvent('monitor_auto_recovery', {
                success: true,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.log('error', 'Auto-recovery failed', error);
            
            await this.logAuditEvent('monitor_auto_recovery', {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Send critical alert
    private async sendCriticalAlert(alertData: any): Promise<void> {
        try {
            // TODO: Implement actual alerting mechanism
            // This could send emails, webhooks, or other notifications
            this.log('info', 'Sending critical alert', alertData);
            
            // Example: Log to audit system for now
            await this.logAuditEvent('monitor_alert_sent', alertData);
            
        } catch (error) {
            this.log('error', 'Failed to send critical alert', error);
        }
    }

    // Calculate uptime percentage
    private calculateUptime(): number {
        if (this.stats.totalChecks === 0) return 100;
        return ((this.stats.successfulChecks / this.stats.totalChecks) * 100);
    }

    // Update uptime statistics
    private updateUptime(): void {
        this.stats.uptime = this.calculateUptime();
    }

    // Update average check duration
    private updateAverageCheckDuration(duration: number): void {
        if (this.stats.successfulChecks === 1) {
            this.stats.averageCheckDuration = duration;
        } else {
            // Exponential moving average
            const alpha = 0.1;
            this.stats.averageCheckDuration = 
                alpha * duration + (1 - alpha) * this.stats.averageCheckDuration;
        }
    }

    // Logging with levels
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        const configLevel = levels[this.config.logLevel];
        const messageLevel = levels[level];

        if (messageLevel >= configLevel) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [${level.toUpperCase()}] [DMS-Monitor] ${message}`;
            
            if (data) {
                console[level === 'error' ? 'error' : 'log'](logMessage, data);
            } else {
                console[level === 'error' ? 'error' : 'log'](logMessage);
            }
        }
    }

    // Log audit events
    private async logAuditEvent(eventType: string, details: any): Promise<void> {
        try {
            await auditLoggingService.logEvent({
                id: `monitor-${Date.now()}`,
                timestamp: new Date().toISOString(),
                eventType: 'system_access',
                action: `dead_man_switch_monitor_${eventType}`,
                result: 'success',
                details,
                riskLevel: eventType.includes('error') || eventType.includes('critical') ? 'high' : 'low',
                hash: ''
            });
        } catch (error) {
            this.log('error', 'Failed to log audit event', error);
        }
    }

    // Get current status
    getStatus(): { isRunning: boolean; config: MonitoringConfig; stats: MonitoringStats; uptime: number } {
        return {
            isRunning: this.isRunning,
            config: this.config,
            stats: this.stats,
            uptime: Date.now() - this.startTime.getTime()
        };
    }

    // Update configuration
    updateConfig(newConfig: Partial<MonitoringConfig>): void {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        this.log('info', 'Configuration updated', {
            oldConfig,
            newConfig: this.config
        });

        // Restart monitoring if interval changed
        if (newConfig.checkIntervalMinutes && this.isRunning) {
            this.log('info', 'Restarting monitoring due to interval change');
            this.stop().then(() => this.start());
        }
    }

    // Force a monitoring check
    async forceCheck(): Promise<void> {
        this.log('info', 'Forcing monitoring check');
        await this.performMonitoringCheck();
    }

    // Get detailed statistics
    getDetailedStats(): MonitoringStats & { runtimeMinutes: number; errorRate: number } {
        const runtimeMinutes = Math.floor((Date.now() - this.startTime.getTime()) / (1000 * 60));
        const errorRate = this.stats.totalChecks > 0 ? (this.stats.failedChecks / this.stats.totalChecks) * 100 : 0;

        return {
            ...this.stats,
            runtimeMinutes,
            errorRate
        };
    }
}

// Export singleton instance
export const deadManSwitchMonitor = new DeadManSwitchMonitor();

// Auto-start monitor in production
if (process.env.NODE_ENV === 'production' || process.env.DMS_AUTO_START === 'true') {
    deadManSwitchMonitor.start().catch(console.error);
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down Dead Man\'s Switch monitor');
    await deadManSwitchMonitor.stop();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down Dead Man\'s Switch monitor');
    await deadManSwitchMonitor.stop();
    process.exit(0);
});