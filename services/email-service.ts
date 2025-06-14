import { SharingRecord } from './emergency-sharing-service';
import { ActivationRequest, ActivationLevel } from './manual-activation-service';

export interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class EmailService {
  private transporter: any | null = null;
  private config: EmailConfig;

  constructor() {
    this.config = this.loadEmailConfig();
    if (typeof window === 'undefined') {
      this.initializeTransporter();
    }
  }

  private loadEmailConfig(): EmailConfig {
    // Load configuration from environment variables
    return {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined,
      from: process.env.SMTP_FROM || 'noreply@emergencyaccess.local'
    };
  }

  private async initializeTransporter(): Promise<void> {
    try {
      if (this.isConfigured()) {
        const nodemailer = await import('nodemailer');
        this.transporter = nodemailer.default.createTransport({
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth: this.config.auth,
          tls: {
            rejectUnauthorized: false // For development - should be true in production
          }
        });

        // Verify connection
        await this.transporter?.verify();
        console.log('Email service initialized successfully');
      } else {
        console.warn('Email service not configured - emails will be logged only');
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  private isConfigured(): boolean {
    return !!(this.config.host && this.config.auth?.user && this.config.auth?.pass);
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    // If running on client side, return mock success
    if (typeof window !== 'undefined') {
      console.log('Email service called on client side - mocking success');
      return { success: true, messageId: `client-mock-${Date.now()}` };
    }

    try {
      if (!this.transporter) {
        // If not configured, log the email instead
        console.log('=== EMAIL (Not Configured - Logging Only) ===');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Content: ${options.text || options.html}`);
        console.log('===============================================');
        
        return {
          success: true,
          messageId: `log-${Date.now()}`
        };
      }

      const mailOptions = {
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send emergency access email
   */
  async sendEmergencyAccessEmail(
    recipient: string,
    subject: string,
    content: string,
    attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Convert text content to HTML for better formatting
    const htmlContent = this.textToHtml(content);

    return this.sendEmail({
      to: recipient,
      subject,
      text: content,
      html: htmlContent,
      attachments
    });
  }

  /**
   * Convert plain text to basic HTML
   */
  private textToHtml(text: string): string {
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      // Make URLs clickable
      .replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" style="color: #007bff; text-decoration: none;">$1</a>'
      )
      // Style headings
      .replace(
        /^([A-Z][A-Z\s:]+)$/gm,
        '<h3 style="color: #333; margin: 20px 0 10px 0; font-weight: bold;">$1</h3>'
      );
  }

  /**
   * Test email configuration
   */
  async testConfiguration(): Promise<{
    success: boolean;
    configured: boolean;
    error?: string;
  }> {
    try {
      const configured = this.isConfigured();
      
      if (!configured) {
        return {
          success: true,
          configured: false
        };
      }

      if (!this.transporter) {
        await this.initializeTransporter();
      }

      if (this.transporter) {
        await this.transporter.verify();
        return {
          success: true,
          configured: true
        };
      }

      return {
        success: false,
        configured: true,
        error: 'Failed to initialize transporter'
      };
    } catch (error) {
      return {
        success: false,
        configured: this.isConfigured(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configured: boolean;
    host?: string;
    port?: number;
    from?: string;
    hasAuth: boolean;
  } {
    return {
      configured: this.isConfigured(),
      host: this.config.host,
      port: this.config.port,
      from: this.config.from,
      hasAuth: !!(this.config.auth?.user && this.config.auth?.pass)
    };
  }

  /**
   * Send emergency access granted email
   */
  async sendEmergencyAccessGrantedEmail(
    to: string,
    recipientName: string,
    userId: string,
    accessLevel: ActivationLevel,
    expiresAt: Date
  ): Promise<boolean> {
    const subject = 'Emergency Access Granted - Action Required';
    const html = this.createEmailTemplate({
      title: 'Emergency Access Granted',
      content: `
        <p>Dear ${recipientName},</p>
        <p>You have been granted emergency access to ${userId}'s information.</p>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Access Level:</strong> ${accessLevel.replace('_', ' ')}</p>
          <p><strong>Valid Until:</strong> ${expiresAt.toLocaleString()}</p>
        </div>
        <p>Please use this access responsibly and only for the emergency purpose intended.</p>
      `,
      actionUrl: `${process.env.NEXT_PUBLIC_URL}/emergency-access`,
      actionText: 'Access Emergency Information'
    });

    return this.send({ to, subject, html });
  }

  /**
   * Send activation rejected email
   */
  async sendActivationRejectedEmail(
    to: string,
    recipientName: string,
    reason: string
  ): Promise<boolean> {
    const subject = 'Emergency Access Request Denied';
    const html = this.createEmailTemplate({
      title: 'Access Request Denied',
      content: `
        <p>Dear ${recipientName},</p>
        <p>Your emergency access request has been denied.</p>
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>If you believe this was done in error, please contact the user through other means.</p>
      `
    });

    return this.send({ to, subject, html });
  }

  /**
   * Send activation expired email
   */
  async sendActivationExpiredEmail(
    to: string,
    recipientName: string,
    requestId: string
  ): Promise<boolean> {
    const subject = 'Emergency Access Expired';
    const html = this.createEmailTemplate({
      title: 'Emergency Access Has Expired',
      content: `
        <p>Dear ${recipientName},</p>
        <p>The emergency access grant (ID: ${requestId.slice(0, 8)}) has expired.</p>
        <p>Access to emergency information is no longer available through this activation.</p>
        <p>If continued access is needed, a new request must be initiated.</p>
      `
    });

    return this.send({ to, subject, html });
  }

  /**
   * Send activation cancelled email
   */
  async sendActivationCancelledEmail(
    to: string,
    recipientName: string,
    requestId: string,
    reason: string
  ): Promise<boolean> {
    const subject = 'Emergency Access Cancelled';
    const html = this.createEmailTemplate({
      title: 'Emergency Access Cancelled',
      content: `
        <p>Dear ${recipientName},</p>
        <p>The emergency access grant (ID: ${requestId.slice(0, 8)}) has been cancelled.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>Access to emergency information is no longer available.</p>
      `
    });

    return this.send({ to, subject, html });
  }

  /**
   * Send urgent activation email (for panic button)
   */
  async sendUrgentActivationEmail(
    to: string,
    recipientName: string,
    request: ActivationRequest,
    subject: string
  ): Promise<boolean> {
    const html = this.createEmailTemplate({
      title: 'URGENT: Emergency Access Activated',
      content: `
        <div style="background-color: #fef2f2; border: 2px solid #dc2626; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">IMMEDIATE ACTION REQUIRED</h2>
          <p><strong>${request.initiatorName}</strong> has activated the panic button.</p>
        </div>
        <p>Dear ${recipientName},</p>
        <p>This is an urgent notification that emergency access has been immediately granted due to panic button activation.</p>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Activation Type:</strong> Panic Button</p>
          <p><strong>Access Level:</strong> ${request.activationLevel}</p>
          <p><strong>Reason:</strong> ${request.reason}</p>
          <p><strong>Time:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
        </div>
        <p>Please check on ${request.initiatorName} immediately and take appropriate action.</p>
      `,
      actionUrl: `${process.env.NEXT_PUBLIC_URL}/emergency-access/${request.id}`,
      actionText: 'View Emergency Information'
    });

    return this.send({ to, subject, html });
  }

  /**
   * Send verification required email
   */
  async sendVerificationRequiredEmail(
    to: string,
    userId: string,
    request: ActivationRequest
  ): Promise<boolean> {
    const subject = 'Emergency Access Verification Required';
    const html = this.createEmailTemplate({
      title: 'Verify Emergency Access Request',
      content: `
        <p>Hello,</p>
        <p><strong>${request.initiatorName}</strong> is requesting emergency access to your information.</p>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Requester:</strong> ${request.initiatorName}</p>
          <p><strong>Urgency:</strong> ${request.urgencyLevel}</p>
          <p><strong>Requested Access:</strong> ${request.activationLevel}</p>
          <p><strong>Reason:</strong> ${request.reason}</p>
        </div>
        <p>Please review and approve or deny this request within 5 minutes.</p>
      `,
      actionUrl: `${process.env.NEXT_PUBLIC_URL}/verify-activation/${request.id}`,
      actionText: 'Review Request'
    });

    return this.send({ to, subject, html });
  }

  /**
   * Send professional activation alert
   */
  async sendProfessionalActivationAlert(
    to: string,
    adminName: string,
    request: ActivationRequest,
    professionalType: string
  ): Promise<boolean> {
    const subject = `${professionalType} Professional Emergency Access Activated`;
    const html = this.createEmailTemplate({
      title: 'Professional Emergency Access Alert',
      content: `
        <p>Dear ${adminName},</p>
        <p>A ${professionalType.toLowerCase()} professional has activated emergency access.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Professional:</strong> ${request.initiatorName}</p>
          <p><strong>License:</strong> ${request.professionalCredentials?.licenseNumber || 'N/A'}</p>
          <p><strong>Organization:</strong> ${request.professionalCredentials?.organization || 'N/A'}</p>
          <p><strong>User ID:</strong> ${request.userId}</p>
          <p><strong>Access Level:</strong> ${request.activationLevel}</p>
          <p><strong>Justification:</strong> ${request.reason}</p>
          <p><strong>Time:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
        </div>
        <p>This activation has been logged for compliance purposes.</p>
      `
    });

    return this.send({ to, subject, html });
  }

  /**
   * Send emergency access notification
   */
  async sendEmergencyAccessNotification(
    to: string,
    contactName: string,
    userId: string,
    activationType: string
  ): Promise<boolean> {
    const subject = 'Emergency Access Notification';
    const html = this.createEmailTemplate({
      title: 'Emergency Access Activated',
      content: `
        <p>Dear ${contactName},</p>
        <p>This is to inform you that emergency access has been activated for ${userId}.</p>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Activation Method:</strong> ${activationType}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>You may now have access to emergency information based on your designated permissions.</p>
      `,
      actionUrl: `${process.env.NEXT_PUBLIC_URL}/emergency-access`,
      actionText: 'Access Information'
    });

    return this.send({ to, subject, html });
  }

  /**
   * Send generic activation email
   */
  async sendGenericActivationEmail(
    to: string,
    recipientName: string,
    request: ActivationRequest
  ): Promise<boolean> {
    const subject = 'Emergency Access Activation';
    const html = this.createEmailTemplate({
      title: 'Emergency Access Update',
      content: `
        <p>Dear ${recipientName},</p>
        <p>An emergency access request has been initiated.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Request ID:</strong> ${request.id.slice(0, 8)}</p>
          <p><strong>Type:</strong> ${request.type.replace('_', ' ')}</p>
          <p><strong>Status:</strong> ${request.status.replace('_', ' ')}</p>
          <p><strong>Time:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
        </div>
        <p>Further action may be required. Please check the application for details.</p>
      `
    });

    return this.send({ to, subject, html });
  }
}

// Singleton instance
export const emailService = new EmailService();