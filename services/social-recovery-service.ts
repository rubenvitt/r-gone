import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
    TrustedContact,
    ContactPermission,
    RecoveryApproval,
    RecoveryAttempt
} from '../types/data';
import { auditLoggingService } from './audit-logging-service';

export class SocialRecoveryService {
    private socialRecoveryPath = path.join(process.cwd(), 'data', 'recovery', 'social');
    private contactsPath = path.join(this.socialRecoveryPath, 'contacts');
    private invitationsPath = path.join(this.socialRecoveryPath, 'invitations');
    private approvalsPath = path.join(this.socialRecoveryPath, 'approvals');

    constructor() {
        this.ensureDirectories();
    }

    private async ensureDirectories(): Promise<void> {
        try {
            await fs.mkdir(this.socialRecoveryPath, { recursive: true });
            await fs.mkdir(this.contactsPath, { recursive: true });
            await fs.mkdir(this.invitationsPath, { recursive: true });
            await fs.mkdir(this.approvalsPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create social recovery directories:', error);
        }
    }

    // Add trusted contact
    async addTrustedContact(contactData: {
        name: string;
        email: string;
        phone?: string;
        relationship: string;
        emergencyPriority?: number;
        permissions?: ContactPermission[];
    }): Promise<TrustedContact> {
        try {
            const contact: TrustedContact = {
                id: uuidv4(),
                name: contactData.name,
                email: contactData.email,
                phone: contactData.phone,
                relationship: contactData.relationship,
                verificationCode: crypto.randomBytes(16).toString('hex'),
                isVerified: false,
                emergencyPriority: contactData.emergencyPriority || 1,
                permissions: contactData.permissions || [
                    { action: 'view_recovery_status', granted: true },
                    { action: 'approve_recovery', granted: true }
                ],
                createdAt: new Date().toISOString()
            };

            // Save contact
            const contactPath = path.join(this.contactsPath, `${contact.id}.json`);
            await fs.writeFile(contactPath, JSON.stringify(contact, null, 2));

            // Send verification invitation
            await this.sendVerificationInvitation(contact);

            await this.logSocialRecoveryEvent('trusted_contact_added', {
                contactId: contact.id,
                contactName: contact.name,
                relationship: contact.relationship
            });

            return contact;
        } catch (error) {
            console.error('Failed to add trusted contact:', error);
            throw new Error(`Failed to add trusted contact: ${error}`);
        }
    }

    // Send verification invitation to trusted contact
    async sendVerificationInvitation(contact: TrustedContact): Promise<void> {
        try {
            const invitation = {
                id: uuidv4(),
                contactId: contact.id,
                email: contact.email,
                verificationCode: contact.verificationCode,
                sentAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                isUsed: false,
                invitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/social-recovery/verify/${contact.verificationCode}`
            };

            // Save invitation
            const invitationPath = path.join(this.invitationsPath, `${invitation.id}.json`);
            await fs.writeFile(invitationPath, JSON.stringify(invitation, null, 2));

            // In a real implementation, would send email here
            console.log(`Verification invitation sent to ${contact.email}`);
            console.log(`Verification link: ${invitation.invitationLink}`);

            await this.logSocialRecoveryEvent('verification_invitation_sent', {
                contactId: contact.id,
                email: contact.email,
                invitationId: invitation.id
            });
        } catch (error) {
            console.error('Failed to send verification invitation:', error);
            throw new Error(`Failed to send verification invitation: ${error}`);
        }
    }

    // Verify trusted contact
    async verifyTrustedContact(verificationCode: string, contactInfo: {
        name: string;
        confirmationData: any;
    }): Promise<boolean> {
        try {
            const contacts = await this.getAllTrustedContacts();
            const contact = contacts.find(c => c.verificationCode === verificationCode && !c.isVerified);

            if (!contact) {
                return false;
            }

            // Verify contact identity (simplified verification)
            if (contact.name.toLowerCase() !== contactInfo.name.toLowerCase()) {
                return false;
            }

            // Mark contact as verified
            contact.isVerified = true;
            contact.lastContactAt = new Date().toISOString();

            // Save updated contact
            const contactPath = path.join(this.contactsPath, `${contact.id}.json`);
            await fs.writeFile(contactPath, JSON.stringify(contact, null, 2));

            await this.logSocialRecoveryEvent('trusted_contact_verified', {
                contactId: contact.id,
                contactName: contact.name,
                verifiedAt: contact.lastContactAt
            });

            return true;
        } catch (error) {
            console.error('Failed to verify trusted contact:', error);
            return false;
        }
    }

    // Request social recovery approvals
    async requestSocialRecoveryApprovals(recoveryAttemptId: string, requiredApprovals: number): Promise<RecoveryApproval[]> {
        try {
            const verifiedContacts = await this.getVerifiedTrustedContacts();
            
            if (verifiedContacts.length < requiredApprovals) {
                throw new Error('Insufficient verified trusted contacts for social recovery');
            }

            // Sort contacts by emergency priority
            const prioritizedContacts = verifiedContacts
                .sort((a, b) => a.emergencyPriority - b.emergencyPriority)
                .slice(0, Math.min(verifiedContacts.length, requiredApprovals + 2)); // Request from a few more than required

            const approvals: RecoveryApproval[] = [];

            for (const contact of prioritizedContacts) {
                const approval: RecoveryApproval = {
                    id: uuidv4(),
                    approverId: contact.id,
                    approverName: contact.name,
                    approverType: 'trusted_contact',
                    status: 'pending',
                    requestedAt: new Date().toISOString()
                };

                approvals.push(approval);

                // Send approval request
                await this.sendApprovalRequest(contact, recoveryAttemptId, approval);

                // Save approval request
                const approvalPath = path.join(this.approvalsPath, `${approval.id}.json`);
                await fs.writeFile(approvalPath, JSON.stringify(approval, null, 2));
            }

            await this.logSocialRecoveryEvent('social_recovery_approvals_requested', {
                recoveryAttemptId,
                contactCount: prioritizedContacts.length,
                requiredApprovals
            });

            return approvals;
        } catch (error) {
            console.error('Failed to request social recovery approvals:', error);
            throw new Error(`Failed to request social recovery approvals: ${error}`);
        }
    }

    // Send approval request to trusted contact
    async sendApprovalRequest(contact: TrustedContact, recoveryAttemptId: string, approval: RecoveryApproval): Promise<void> {
        try {
            const approvalRequest = {
                id: uuidv4(),
                contactId: contact.id,
                recoveryAttemptId,
                approvalId: approval.id,
                email: contact.email,
                sentAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
                approvalLink: `${process.env.NEXT_PUBLIC_APP_URL}/social-recovery/approve/${approval.id}`,
                securityCode: crypto.randomBytes(8).toString('hex').toUpperCase()
            };

            // In a real implementation, would send email with approval link and security code
            console.log(`Recovery approval request sent to ${contact.email}`);
            console.log(`Approval link: ${approvalRequest.approvalLink}`);
            console.log(`Security code: ${approvalRequest.securityCode}`);

            await this.logSocialRecoveryEvent('approval_request_sent', {
                contactId: contact.id,
                recoveryAttemptId,
                approvalId: approval.id,
                securityCode: approvalRequest.securityCode
            });
        } catch (error) {
            console.error('Failed to send approval request:', error);
            throw new Error(`Failed to send approval request: ${error}`);
        }
    }

    // Process approval response from trusted contact
    async processApprovalResponse(approvalId: string, response: {
        approved: boolean;
        securityCode: string;
        comments?: string;
        verificationData?: Record<string, any>;
    }): Promise<RecoveryApproval> {
        try {
            const approvalPath = path.join(this.approvalsPath, `${approvalId}.json`);
            const approvalData = await fs.readFile(approvalPath, 'utf-8');
            const approval: RecoveryApproval = JSON.parse(approvalData);

            if (approval.status !== 'pending') {
                throw new Error('Approval request is not pending');
            }

            // Verify security code (simplified verification)
            // In real implementation would verify against the code sent in email
            if (response.securityCode.length !== 16) {
                throw new Error('Invalid security code');
            }

            // Update approval
            approval.status = response.approved ? 'approved' : 'denied';
            approval.respondedAt = new Date().toISOString();
            approval.comments = response.comments;
            approval.verificationData = response.verificationData;

            // Save updated approval
            await fs.writeFile(approvalPath, JSON.stringify(approval, null, 2));

            // Update contact's last contact time
            await this.updateContactLastContact(approval.approverId);

            await this.logSocialRecoveryEvent('approval_response_processed', {
                approvalId,
                approverId: approval.approverId,
                approved: response.approved,
                respondedAt: approval.respondedAt
            });

            return approval;
        } catch (error) {
            console.error('Failed to process approval response:', error);
            throw new Error(`Failed to process approval response: ${error}`);
        }
    }

    // Check if sufficient approvals are received
    async checkSufficientApprovals(approvals: RecoveryApproval[], requiredCount: number): Promise<boolean> {
        const approvedCount = approvals.filter(a => a.status === 'approved').length;
        const deniedCount = approvals.filter(a => a.status === 'denied').length;
        const pendingCount = approvals.filter(a => a.status === 'pending').length;

        // Check if we have enough approvals
        if (approvedCount >= requiredCount) {
            return true;
        }

        // Check if it's impossible to get enough approvals
        const maxPossibleApprovals = approvedCount + pendingCount;
        if (maxPossibleApprovals < requiredCount) {
            throw new Error('Insufficient approvals: too many contacts have denied the request');
        }

        return false;
    }

    // Get trusted contact by ID
    async getTrustedContact(contactId: string): Promise<TrustedContact | null> {
        try {
            const contactPath = path.join(this.contactsPath, `${contactId}.json`);
            const contactData = await fs.readFile(contactPath, 'utf-8');
            return JSON.parse(contactData);
        } catch {
            return null;
        }
    }

    // Update trusted contact
    async updateTrustedContact(contactId: string, updates: Partial<TrustedContact>): Promise<TrustedContact> {
        try {
            const contact = await this.getTrustedContact(contactId);
            if (!contact) {
                throw new Error('Trusted contact not found');
            }

            const updatedContact = { ...contact, ...updates };
            
            const contactPath = path.join(this.contactsPath, `${contactId}.json`);
            await fs.writeFile(contactPath, JSON.stringify(updatedContact, null, 2));

            await this.logSocialRecoveryEvent('trusted_contact_updated', {
                contactId,
                updates: Object.keys(updates)
            });

            return updatedContact;
        } catch (error) {
            console.error('Failed to update trusted contact:', error);
            throw new Error(`Failed to update trusted contact: ${error}`);
        }
    }

    // Remove trusted contact
    async removeTrustedContact(contactId: string): Promise<boolean> {
        try {
            const contactPath = path.join(this.contactsPath, `${contactId}.json`);
            await fs.unlink(contactPath);

            await this.logSocialRecoveryEvent('trusted_contact_removed', {
                contactId
            });

            return true;
        } catch (error) {
            console.error('Failed to remove trusted contact:', error);
            return false;
        }
    }

    // Get all trusted contacts
    async getAllTrustedContacts(): Promise<TrustedContact[]> {
        try {
            const files = await fs.readdir(this.contactsPath);
            const contacts: TrustedContact[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const contactData = await fs.readFile(path.join(this.contactsPath, file), 'utf-8');
                    contacts.push(JSON.parse(contactData));
                }
            }

            return contacts.sort((a, b) => a.emergencyPriority - b.emergencyPriority);
        } catch {
            return [];
        }
    }

    // Get verified trusted contacts only
    async getVerifiedTrustedContacts(): Promise<TrustedContact[]> {
        const allContacts = await this.getAllTrustedContacts();
        return allContacts.filter(contact => contact.isVerified);
    }

    // Get social recovery statistics
    async getSocialRecoveryStatistics(): Promise<{
        totalContacts: number;
        verifiedContacts: number;
        unverifiedContacts: number;
        averageResponseTime: number; // hours
        approvalSuccessRate: number; // percentage
        lastActivityAt?: string;
    }> {
        try {
            const contacts = await this.getAllTrustedContacts();
            const verifiedContacts = contacts.filter(c => c.isVerified);
            
            // Get all approvals to calculate statistics
            const approvals = await this.getAllApprovals();
            const respondedApprovals = approvals.filter(a => a.respondedAt);
            
            let averageResponseTime = 0;
            if (respondedApprovals.length > 0) {
                const totalResponseTime = respondedApprovals.reduce((sum, approval) => {
                    const responseTime = new Date(approval.respondedAt!).getTime() - new Date(approval.requestedAt).getTime();
                    return sum + (responseTime / (1000 * 60 * 60)); // Convert to hours
                }, 0);
                averageResponseTime = totalResponseTime / respondedApprovals.length;
            }

            const approvedCount = approvals.filter(a => a.status === 'approved').length;
            const approvalSuccessRate = approvals.length > 0 ? (approvedCount / approvals.length) * 100 : 0;

            const lastActivityAt = contacts.reduce((latest, contact) => {
                if (contact.lastContactAt && (!latest || contact.lastContactAt > latest)) {
                    return contact.lastContactAt;
                }
                return latest;
            }, undefined as string | undefined);

            return {
                totalContacts: contacts.length,
                verifiedContacts: verifiedContacts.length,
                unverifiedContacts: contacts.length - verifiedContacts.length,
                averageResponseTime,
                approvalSuccessRate,
                lastActivityAt
            };
        } catch (error) {
            console.error('Failed to get social recovery statistics:', error);
            throw new Error('Failed to get social recovery statistics');
        }
    }

    // Helper methods
    private async getAllApprovals(): Promise<RecoveryApproval[]> {
        try {
            const files = await fs.readdir(this.approvalsPath);
            const approvals: RecoveryApproval[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const approvalData = await fs.readFile(path.join(this.approvalsPath, file), 'utf-8');
                    approvals.push(JSON.parse(approvalData));
                }
            }

            return approvals.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        } catch {
            return [];
        }
    }

    private async updateContactLastContact(contactId: string): Promise<void> {
        try {
            const contact = await this.getTrustedContact(contactId);
            if (contact) {
                contact.lastContactAt = new Date().toISOString();
                const contactPath = path.join(this.contactsPath, `${contactId}.json`);
                await fs.writeFile(contactPath, JSON.stringify(contact, null, 2));
            }
        } catch (error) {
            console.error('Failed to update contact last contact time:', error);
        }
    }

    private async logSocialRecoveryEvent(eventType: string, details: any): Promise<void> {
        await auditLoggingService.logEvent({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            eventType: 'social_recovery',
            action: eventType,
            result: 'success',
            details,
            riskLevel: 'medium',
            hash: ''
        });
    }

    // Test and validation methods
    async validateSocialRecoverySetup(): Promise<{
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    }> {
        const issues: string[] = [];
        const recommendations: string[] = [];

        const contacts = await this.getAllTrustedContacts();
        const verifiedContacts = contacts.filter(c => c.isVerified);

        if (contacts.length === 0) {
            issues.push('No trusted contacts configured');
        }

        if (contacts.length < 3) {
            recommendations.push('Consider adding at least 3 trusted contacts for better security');
        }

        if (verifiedContacts.length < 2) {
            issues.push('Insufficient verified trusted contacts (minimum 2 required)');
        }

        const unverifiedContacts = contacts.filter(c => !c.isVerified);
        if (unverifiedContacts.length > 0) {
            recommendations.push(`${unverifiedContacts.length} contact(s) need verification`);
        }

        // Check for diverse relationships
        const relationships = [...new Set(contacts.map(c => c.relationship))];
        if (relationships.length === 1) {
            recommendations.push('Consider adding contacts with different relationships (family, friends, colleagues)');
        }

        return {
            isValid: issues.length === 0,
            issues,
            recommendations
        };
    }

    async testContactReachability(contactId: string): Promise<boolean> {
        try {
            const contact = await this.getTrustedContact(contactId);
            if (!contact) {
                return false;
            }

            // In a real implementation, would send a test message
            console.log(`Testing reachability for contact: ${contact.email}`);
            
            // Mock successful test
            await this.updateContactLastContact(contactId);
            
            await this.logSocialRecoveryEvent('contact_reachability_tested', {
                contactId,
                contactEmail: contact.email,
                reachable: true
            });

            return true;
        } catch (error) {
            console.error('Failed to test contact reachability:', error);
            return false;
        }
    }
}

export const socialRecoveryService = new SocialRecoveryService();