import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { NotificationMethod, DeadManSwitch } from '../types/data';

interface NotificationTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    type: 'email' | 'sms' | 'push';
    variables: string[]; // List of available template variables
}

interface NotificationHistory {
    id: string;
    method: NotificationMethod;
    recipient: string;
    subject?: string;
    content: string;
    sentAt: string;
    status: 'sent' | 'delivered' | 'failed' | 'bounced';
    error?: string;
    deliveredAt?: string;
    readAt?: string;
    metadata?: Record<string, any>;
}

interface NotificationConfig {
    email: {
        enabled: boolean;
        smtpHost?: string;
        smtpPort?: number;
        smtpUser?: string;
        smtpPassword?: string;
        fromAddress?: string;
        fromName?: string;
        replyTo?: string;
    };
    sms: {
        enabled: boolean;
        provider?: 'twilio' | 'aws-sns' | 'custom';
        apiKey?: string;
        apiSecret?: string;
        fromNumber?: string;
    };
    push: {
        enabled: boolean;
        provider?: 'firebase' | 'apns' | 'custom';
        apiKey?: string;
        serverKey?: string;
    };
    webhook: {
        enabled: boolean;
        url?: string;
        secret?: string;
        headers?: Record<string, string>;
    };
    phoneCall: {
        enabled: boolean;
        provider?: 'twilio' | 'custom';
        apiKey?: string;
        apiSecret?: string;
        fromNumber?: string;
        voiceMessage?: string;
    };
}

class NotificationService {
    private dataPath = path.join(process.cwd(), 'data', 'notifications');
    private configPath = path.join(this.dataPath, 'notification-config.json');
    private historyPath = path.join(this.dataPath, 'notification-history.json');
    private templatesPath = path.join(this.dataPath, 'notification-templates.json');

    constructor() {
        this.ensureDataDirectoryExists();
        this.initializeDefaultTemplates();
    }

    private async ensureDataDirectoryExists(): Promise<void> {
        try {
            await fs.mkdir(this.dataPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create notification data directory:', error);
        }
    }

    // Initialize default notification templates
    private async initializeDefaultTemplates(): Promise<void> {
        try {
            await fs.access(this.templatesPath);
        } catch {
            // File doesn't exist, create default templates
            const defaultTemplates: NotificationTemplate[] = [
                {
                    id: 'warning_7_days',
                    name: '7 Day Warning',
                    subject: 'Dead Man\'s Switch Warning - 7 Days Remaining',
                    type: 'email',
                    body: `Dear {{userName}},

This is an automated notification from your Dead Man's Switch system.

Your account has been inactive for {{daysSinceActivity}} days. The system will activate emergency access in {{daysUntilActivation}} days if no activity is detected.

To prevent activation, please:
1. Log into your account at {{loginUrl}}
2. Click the "Check In" button
3. Or reply to this email with "ACTIVE"

If you are going on vacation or will be unavailable, you can activate Holiday Mode to temporarily pause the system.

System Details:
- Switch ID: {{switchId}}
- Last Activity: {{lastActivity}}
- Scheduled Activation: {{scheduledActivation}}

If you did not set up this system or believe this is an error, please contact support immediately.

Stay safe,
Your Digital Legacy System`,
                    variables: ['userName', 'daysSinceActivity', 'daysUntilActivation', 'loginUrl', 'switchId', 'lastActivity', 'scheduledActivation']
                },
                {
                    id: 'warning_3_days',
                    name: '3 Day Warning',
                    subject: 'URGENT: Dead Man\'s Switch Warning - 3 Days Remaining',
                    type: 'email',
                    body: `URGENT NOTICE - Dead Man's Switch Activation Warning

Dear {{userName}},

This is an URGENT automated notification from your Dead Man's Switch system.

Your account has been inactive for {{daysSinceActivity}} days. The system will activate emergency access in only {{daysUntilActivation}} days if no activity is detected.

IMMEDIATE ACTION REQUIRED:
1. Log into your account immediately at {{loginUrl}}
2. Click the "Check In" button to reset the timer
3. Or reply to this email with "ACTIVE"

This is your second warning. If you do not respond, your emergency contacts will be notified and granted access to your secured information.

System Details:
- Switch ID: {{switchId}}
- Last Activity: {{lastActivity}}
- Scheduled Activation: {{scheduledActivation}}
- Emergency Contacts: {{emergencyContactCount}} contacts will be notified

If you are unable to access your account due to an emergency, your trusted contacts will be able to help.

If this is a false alarm, please respond immediately.

Your Digital Legacy System`,
                    variables: ['userName', 'daysSinceActivity', 'daysUntilActivation', 'loginUrl', 'switchId', 'lastActivity', 'scheduledActivation', 'emergencyContactCount']
                },
                {
                    id: 'final_warning',
                    name: 'Final Warning',
                    subject: 'FINAL WARNING: Dead Man\'s Switch Activates in 24 Hours',
                    type: 'email',
                    body: `FINAL WARNING - Dead Man's Switch Activation in 24 Hours

Dear {{userName}},

This is the FINAL WARNING from your Dead Man's Switch system.

Your account has been inactive for {{daysSinceActivity}} days. The system will automatically activate emergency access in {{daysUntilActivation}} day(s) if no response is received.

CRITICAL: LAST CHANCE TO RESPOND
1. Log into your account NOW at {{loginUrl}}
2. Click the "Check In" button
3. Or call our emergency line: {{emergencyPhone}}
4. Or reply to this email with "ACTIVE"

What happens if you don't respond:
- Your emergency contacts will be notified
- Trusted beneficiaries will gain access to your digital assets
- Your secured information will be released according to your instructions

System Details:
- Switch ID: {{switchId}}
- Last Activity: {{lastActivity}}
- Scheduled Activation: {{scheduledActivation}}
- Emergency Contacts: {{emergencyContactList}}

If you are reading this and are safe, please respond immediately to prevent activation.

If you are in an emergency and cannot respond, the system will work as designed to protect your digital legacy.

Your Digital Legacy System`,
                    variables: ['userName', 'daysSinceActivity', 'daysUntilActivation', 'loginUrl', 'emergencyPhone', 'switchId', 'lastActivity', 'scheduledActivation', 'emergencyContactList']
                },
                {
                    id: 'activation_notice',
                    name: 'Activation Notice',
                    subject: 'Dead Man\'s Switch Activated - Emergency Access Granted',
                    type: 'email',
                    body: `Dead Man's Switch Activated - Emergency Access Initiated

This is an automated notification that the Dead Man's Switch for {{userName}} has been activated.

The system detected no activity for {{daysSinceActivity}} days and has initiated emergency access protocols.

Activation Details:
- User: {{userName}}
- Switch ID: {{switchId}}
- Last Known Activity: {{lastActivity}}
- Activation Time: {{activationTime}}
- Access Level: {{accessLevel}}

Emergency contacts and beneficiaries have been notified and will receive access according to the predefined access control matrix.

If this activation was triggered in error, emergency override procedures are available for a limited time.

Emergency Override Contact: {{emergencyOverrideContact}}

This is an automated system notification.`,
                    variables: ['userName', 'daysSinceActivity', 'switchId', 'lastActivity', 'activationTime', 'accessLevel', 'emergencyOverrideContact']
                },
                {
                    id: 'sms_warning_3_days',
                    name: 'SMS 3 Day Warning',
                    subject: '',
                    type: 'sms',
                    body: 'URGENT: Dead Man\'s Switch warning. Your account inactive {{daysSinceActivity}} days. System activates in {{daysUntilActivation}} days. Log in at {{shortUrl}} or reply ACTIVE. ID: {{switchId}}',
                    variables: ['daysSinceActivity', 'daysUntilActivation', 'shortUrl', 'switchId']
                },
                {
                    id: 'sms_final_warning',
                    name: 'SMS Final Warning',
                    subject: '',
                    type: 'sms',
                    body: 'FINAL WARNING: Dead Man\'s Switch activates in {{daysUntilActivation}} day(s). Inactive {{daysSinceActivity}} days. RESPOND NOW at {{shortUrl}} or call {{emergencyPhone}}. ID: {{switchId}}',
                    variables: ['daysUntilActivation', 'daysSinceActivity', 'shortUrl', 'emergencyPhone', 'switchId']
                }
            ];

            await fs.writeFile(this.templatesPath, JSON.stringify(defaultTemplates, null, 2));
        }
    }

    // Send notification using the specified method
    async sendNotification(
        method: NotificationMethod,
        templateId: string,
        deadManSwitch: DeadManSwitch,
        variables: Record<string, any> = {}
    ): Promise<boolean> {
        try {
            const template = await this.getTemplate(templateId);
            if (!template) {
                throw new Error(`Template ${templateId} not found`);
            }

            const content = this.processTemplate(template, variables);
            const recipient = method.destination;

            let success = false;

            switch (method.type) {
                case 'email':
                    success = await this.sendEmail(recipient, content.subject || template.subject, content.body);
                    break;
                case 'sms':
                    success = await this.sendSMS(recipient, content.body);
                    break;
                case 'push':
                    success = await this.sendPushNotification(recipient, content.subject || template.subject, content.body);
                    break;
                case 'phone_call':
                    success = await this.makePhoneCall(recipient, content.body);
                    break;
                case 'webhook':
                    success = await this.sendWebhook(recipient, {
                        subject: content.subject,
                        body: content.body,
                        switchId: deadManSwitch.id,
                        variables
                    });
                    break;
                default:
                    throw new Error(`Unsupported notification method: ${method.type}`);
            }

            // Record notification history
            await this.recordNotification({
                id: uuidv4(),
                method,
                recipient,
                subject: content.subject,
                content: content.body,
                sentAt: new Date().toISOString(),
                status: success ? 'sent' : 'failed',
                metadata: {
                    templateId,
                    switchId: deadManSwitch.id,
                    variables
                }
            });

            return success;
        } catch (error) {
            console.error('Failed to send notification:', error);
            
            // Record failed notification
            await this.recordNotification({
                id: uuidv4(),
                method,
                recipient: method.destination,
                content: `Failed to send notification: ${error}`,
                sentAt: new Date().toISOString(),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                metadata: {
                    templateId,
                    switchId: deadManSwitch.id
                }
            });

            return false;
        }
    }

    // Process template with variables
    private processTemplate(template: NotificationTemplate, variables: Record<string, any>): { subject?: string; body: string } {
        let processedBody = template.body;
        let processedSubject = template.subject;

        // Replace template variables
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            processedBody = processedBody.replace(new RegExp(placeholder, 'g'), String(value));
            if (processedSubject) {
                processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), String(value));
            }
        }

        return {
            subject: processedSubject,
            body: processedBody
        };
    }

    // Email sending implementation (placeholder)
    private async sendEmail(recipient: string, subject: string, body: string): Promise<boolean> {
        // TODO: Implement actual email sending using SMTP or email service
        console.log(`Sending email to ${recipient}:`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${body}`);
        
        // Simulate email sending
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(Math.random() > 0.1); // 90% success rate for simulation
            }, 1000);
        });
    }

    // SMS sending implementation (placeholder)
    private async sendSMS(recipient: string, message: string): Promise<boolean> {
        // TODO: Implement actual SMS sending using Twilio, AWS SNS, etc.
        console.log(`Sending SMS to ${recipient}: ${message}`);
        
        // Simulate SMS sending
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(Math.random() > 0.05); // 95% success rate for simulation
            }, 500);
        });
    }

    // Push notification implementation (placeholder)
    private async sendPushNotification(recipient: string, title: string, body: string): Promise<boolean> {
        // TODO: Implement actual push notification sending using Firebase, APNS, etc.
        console.log(`Sending push notification to ${recipient}:`);
        console.log(`Title: ${title}`);
        console.log(`Body: ${body}`);
        
        // Simulate push notification
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(Math.random() > 0.02); // 98% success rate for simulation
            }, 300);
        });
    }

    // Phone call implementation (placeholder)
    private async makePhoneCall(recipient: string, message: string): Promise<boolean> {
        // TODO: Implement actual phone call using Twilio Voice API, etc.
        console.log(`Making phone call to ${recipient} with message: ${message}`);
        
        // Simulate phone call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(Math.random() > 0.15); // 85% success rate for simulation
            }, 2000);
        });
    }

    // Webhook implementation (placeholder)
    private async sendWebhook(url: string, data: any): Promise<boolean> {
        // TODO: Implement actual webhook sending
        console.log(`Sending webhook to ${url}:`, data);
        
        try {
            // Simulate webhook call
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            return response.ok;
        } catch (error) {
            console.error('Webhook failed:', error);
            return false;
        }
    }

    // Get notification template
    private async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
        try {
            const data = await fs.readFile(this.templatesPath, 'utf-8');
            const templates: NotificationTemplate[] = JSON.parse(data);
            return templates.find(t => t.id === templateId) || null;
        } catch (error) {
            console.error('Failed to load templates:', error);
            return null;
        }
    }

    // Record notification in history
    private async recordNotification(notification: NotificationHistory): Promise<void> {
        try {
            let history: NotificationHistory[] = [];
            
            try {
                const data = await fs.readFile(this.historyPath, 'utf-8');
                history = JSON.parse(data);
            } catch {
                // File doesn't exist yet
            }

            history.push(notification);

            // Keep only last 1000 notifications
            if (history.length > 1000) {
                history = history.slice(-1000);
            }

            await fs.writeFile(this.historyPath, JSON.stringify(history, null, 2));
        } catch (error) {
            console.error('Failed to record notification:', error);
        }
    }

    // Get notification configuration
    async getConfig(): Promise<NotificationConfig> {
        try {
            const data = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(data);
        } catch {
            // Return default configuration
            const defaultConfig: NotificationConfig = {
                email: {
                    enabled: false
                },
                sms: {
                    enabled: false
                },
                push: {
                    enabled: false
                },
                webhook: {
                    enabled: false
                },
                phoneCall: {
                    enabled: false
                }
            };

            await this.saveConfig(defaultConfig);
            return defaultConfig;
        }
    }

    // Save notification configuration
    async saveConfig(config: NotificationConfig): Promise<void> {
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    }

    // Get notification history
    async getHistory(limit: number = 100): Promise<NotificationHistory[]> {
        try {
            const data = await fs.readFile(this.historyPath, 'utf-8');
            const history: NotificationHistory[] = JSON.parse(data);
            return history.slice(-limit).reverse();
        } catch {
            return [];
        }
    }

    // Get all templates
    async getTemplates(): Promise<NotificationTemplate[]> {
        try {
            const data = await fs.readFile(this.templatesPath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    // Add or update template
    async saveTemplate(template: NotificationTemplate): Promise<void> {
        const templates = await this.getTemplates();
        const existingIndex = templates.findIndex(t => t.id === template.id);
        
        if (existingIndex >= 0) {
            templates[existingIndex] = template;
        } else {
            templates.push(template);
        }

        await fs.writeFile(this.templatesPath, JSON.stringify(templates, null, 2));
    }

    // Delete template
    async deleteTemplate(templateId: string): Promise<boolean> {
        const templates = await this.getTemplates();
        const filtered = templates.filter(t => t.id !== templateId);
        
        if (filtered.length !== templates.length) {
            await fs.writeFile(this.templatesPath, JSON.stringify(filtered, null, 2));
            return true;
        }
        
        return false;
    }

    // Test notification method
    async testNotification(method: NotificationMethod, message: string = 'Test notification'): Promise<boolean> {
        try {
            switch (method.type) {
                case 'email':
                    return await this.sendEmail(method.destination, 'Test Notification', message);
                case 'sms':
                    return await this.sendSMS(method.destination, message);
                case 'push':
                    return await this.sendPushNotification(method.destination, 'Test', message);
                case 'phone_call':
                    return await this.makePhoneCall(method.destination, message);
                case 'webhook':
                    return await this.sendWebhook(method.destination, { test: true, message });
                default:
                    return false;
            }
        } catch (error) {
            console.error('Test notification failed:', error);
            return false;
        }
    }

    // Generate template variables for a dead man's switch
    generateTemplateVariables(deadManSwitch: DeadManSwitch, daysUntilActivation: number): Record<string, any> {
        const now = new Date();
        const lastActivity = new Date(deadManSwitch.lastActivity);
        const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        const scheduledActivation = new Date(now.getTime() + daysUntilActivation * 24 * 60 * 60 * 1000);

        return {
            userName: 'User', // TODO: Get actual user name
            switchId: deadManSwitch.id.substring(0, 8),
            daysSinceActivity: daysSinceActivity.toString(),
            daysUntilActivation: daysUntilActivation.toString(),
            lastActivity: lastActivity.toLocaleDateString(),
            scheduledActivation: scheduledActivation.toLocaleDateString(),
            activationTime: now.toISOString(),
            loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login`,
            shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkin`,
            emergencyPhone: process.env.EMERGENCY_PHONE || '+1-800-EMERGENCY',
            emergencyContactCount: deadManSwitch.configuration.emergencyContacts.length.toString(),
            emergencyContactList: deadManSwitch.configuration.emergencyContacts
                .map(contact => `${contact.name} (${contact.relationship})`)
                .join(', '),
            accessLevel: 'Standard', // TODO: Determine actual access level
            emergencyOverrideContact: process.env.EMERGENCY_OVERRIDE_CONTACT || 'support@example.com'
        };
    }
}

export const notificationService = new NotificationService();