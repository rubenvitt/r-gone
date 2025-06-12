import nodemailer from 'nodemailer';
import { SharingRecord } from './emergency-sharing-service';

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
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;

  constructor() {
    this.config = this.loadEmailConfig();
    this.initializeTransporter();
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
        this.transporter = nodemailer.createTransport({
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
}

// Singleton instance
export const emailService = new EmailService();