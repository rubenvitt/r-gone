import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

export interface EmergencyAccessToken {
  id: string;
  contactId: string;
  fileIds: string[];
  accessLevel: 'view' | 'download' | 'full';
  tokenType: 'temporary' | 'long-term' | 'permanent';
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
  maxUses: number;
  currentUses: number;
  ipRestrictions?: string[];
  refreshable: boolean;
  lastRefreshedAt?: string;
  activatedAt?: string;
  metadata?: Record<string, any>;
}

export interface EmergencyContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  defaultAccessLevel: 'view' | 'download' | 'full';
  allowedFileIds?: string[];
  groupIds?: string[];
  notes?: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  contactIds: string[];
  defaultAccessLevel: 'view' | 'download' | 'full';
  createdAt: string;
  updatedAt: string;
}

export interface AccessLog {
  id: string;
  tokenId: string;
  contactId: string;
  timestamp: string;
  action: 'created' | 'accessed' | 'revoked' | 'expired' | 'failed' | 'shared' | 'view' | 'download' | 'print' | 'refreshed' | 'activated';
  ipAddress?: string;
  userAgent?: string;
  fileAccessed?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TokenValidation {
  valid: boolean;
  token?: EmergencyAccessToken;
  contact?: EmergencyContact;
  error?: string;
  remainingUses?: number;
  expiresIn?: number;
}

export class EmergencyAccessService {
  private dataDir: string;
  private jwtSecret: string;
  private defaultExpirationHours: number = 72; // 3 days
  private defaultMaxUses: number = 10;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'emergency-access');
    // In production, this should come from environment variables
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get base URL for generating access links
   * Priority: ENV variable > localhost with detected port > fallback
   */
  private getBaseUrl(): string {
    // 1. Check environment variable
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      return process.env.NEXT_PUBLIC_BASE_URL;
    }

    // 2. Check if we have host header information (for reverse proxy)
    if (process.env.HOST_HEADER) {
      const protocol = process.env.FORCE_HTTPS === 'true' ? 'https' : 'http';
      return `${protocol}://${process.env.HOST_HEADER}`;
    }

    // 3. Try to detect port from Next.js
    const port = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3000';
    return `http://localhost:${port}`;
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(path.join(this.dataDir, 'tokens'), { recursive: true });
    await fs.mkdir(path.join(this.dataDir, 'contacts'), { recursive: true });
    await fs.mkdir(path.join(this.dataDir, 'groups'), { recursive: true });
    await fs.mkdir(path.join(this.dataDir, 'logs'), { recursive: true });
  }

  /**
   * Generate a secure emergency access token
   */
  async generateToken(options: {
    contactId: string;
    fileIds?: string[];
    accessLevel?: 'view' | 'download' | 'full';
    tokenType?: 'temporary' | 'long-term' | 'permanent';
    expirationHours?: number;
    maxUses?: number;
    ipRestrictions?: string[];
    refreshable?: boolean;
    metadata?: Record<string, any>;
  }): Promise<{
    token: string;
    url: string;
    tokenData: EmergencyAccessToken;
  }> {
    await this.ensureDirectories();

    const contact = await this.getContact(options.contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const tokenId = crypto.randomUUID();
    const now = new Date();
    const tokenType = options.tokenType || 'temporary';
    
    // Calculate expiration based on token type
    let expiresAt: Date;
    let maxUses: number;
    
    switch (tokenType) {
      case 'permanent':
        // Permanent tokens expire in 100 years (effectively never)
        expiresAt = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
        maxUses = options.maxUses || 999999; // Very high limit
        break;
      case 'long-term':
        // Long-term tokens expire in 1-5 years (default 2 years)
        const longTermHours = options.expirationHours || (2 * 365 * 24); // 2 years
        expiresAt = new Date(now.getTime() + longTermHours * 60 * 60 * 1000);
        maxUses = options.maxUses || 1000; // Higher limit
        break;
      case 'temporary':
      default:
        // Temporary tokens use the original logic
        expiresAt = new Date(now.getTime() + (options.expirationHours || this.defaultExpirationHours) * 60 * 60 * 1000);
        maxUses = options.maxUses || this.defaultMaxUses;
        break;
    }

    const tokenData: EmergencyAccessToken = {
      id: tokenId,
      contactId: options.contactId,
      fileIds: options.fileIds || contact.allowedFileIds || [],
      accessLevel: options.accessLevel || contact.defaultAccessLevel || 'view',
      tokenType,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxUses,
      currentUses: 0,
      ipRestrictions: options.ipRestrictions,
      refreshable: options.refreshable !== false, // Default to true
      metadata: options.metadata
    };

    // Create JWT token
    const jwtPayload = {
      tokenId,
      contactId: options.contactId,
      accessLevel: tokenData.accessLevel,
      exp: Math.floor(expiresAt.getTime() / 1000)
    };

    const jwtToken = jwt.sign(jwtPayload, this.jwtSecret);

    // Save token data
    await this.saveToken(tokenData);

    // Log token creation
    await this.logAccess({
      tokenId,
      contactId: options.contactId,
      action: 'created',
      success: true,
      metadata: {
        expiresAt: tokenData.expiresAt,
        maxUses: tokenData.maxUses,
        fileCount: tokenData.fileIds.length
      }
    });

    // Generate URL - use environment variable or detect from request
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/emergency-access/${jwtToken}`;

    return {
      token: jwtToken,
      url,
      tokenData
    };
  }

  /**
   * Refresh an emergency access token (extend expiration)
   */
  async refreshToken(tokenId: string, extensionHours?: number): Promise<{
    token: string;
    url: string;
    tokenData: EmergencyAccessToken;
  }> {
    const tokenData = await this.getToken(tokenId);
    if (!tokenData) {
      throw new Error('Token not found');
    }

    if (tokenData.revokedAt) {
      throw new Error('Cannot refresh revoked token');
    }

    if (!tokenData.refreshable) {
      throw new Error('Token is not refreshable');
    }

    // Calculate new expiration
    const now = new Date();
    let newExpiresAt: Date;

    switch (tokenData.tokenType) {
      case 'permanent':
        // Permanent tokens don't need refreshing, but we'll update the timestamp
        newExpiresAt = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
        break;
      case 'long-term':
        // Extend by specified hours or default to 1 year
        const extensionMs = (extensionHours || 365 * 24) * 60 * 60 * 1000;
        newExpiresAt = new Date(now.getTime() + extensionMs);
        break;
      case 'temporary':
        // Extend by specified hours or default expiration
        const tempExtensionMs = (extensionHours || this.defaultExpirationHours) * 60 * 60 * 1000;
        newExpiresAt = new Date(now.getTime() + tempExtensionMs);
        break;
      default:
        throw new Error('Unknown token type');
    }

    // Update token data
    const updatedTokenData: EmergencyAccessToken = {
      ...tokenData,
      expiresAt: newExpiresAt.toISOString(),
      lastRefreshedAt: now.toISOString()
    };

    await this.saveToken(updatedTokenData);

    // Generate new JWT
    const jwtPayload = {
      tokenId: tokenData.id,
      contactId: tokenData.contactId,
      accessLevel: tokenData.accessLevel,
      exp: Math.floor(newExpiresAt.getTime() / 1000),
      iat: Math.floor(now.getTime() / 1000)
    };

    const jwtToken = jwt.sign(jwtPayload, this.jwtSecret);

    // Log refresh
    await this.logAccess({
      tokenId,
      contactId: tokenData.contactId,
      action: 'refreshed',
      success: true,
      metadata: {
        oldExpiresAt: tokenData.expiresAt,
        newExpiresAt: updatedTokenData.expiresAt,
        extensionHours: extensionHours || 'default'
      }
    });

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/emergency-access/${jwtToken}`;

    return {
      token: jwtToken,
      url,
      tokenData: updatedTokenData
    };
  }

  /**
   * Activate a token (useful for permanent tokens that start inactive)
   */
  async activateToken(tokenId: string): Promise<void> {
    const tokenData = await this.getToken(tokenId);
    if (!tokenData) {
      throw new Error('Token not found');
    }

    if (tokenData.revokedAt) {
      throw new Error('Cannot activate revoked token');
    }

    const now = new Date();
    const updatedTokenData: EmergencyAccessToken = {
      ...tokenData,
      activatedAt: now.toISOString()
    };

    await this.saveToken(updatedTokenData);

    // Log activation
    await this.logAccess({
      tokenId,
      contactId: tokenData.contactId,
      action: 'activated',
      success: true,
      metadata: {
        activatedAt: now.toISOString(),
        tokenType: tokenData.tokenType
      }
    });
  }

  /**
   * Generate JWT token for an existing token ID
   */
  async generateJwtForToken(tokenId: string): Promise<string> {
    const tokenData = await this.getToken(tokenId);
    if (!tokenData) {
      throw new Error('Token not found');
    }

    // Create JWT payload
    const payload = {
      tokenId: tokenData.id,
      contactId: tokenData.contactId,
      accessLevel: tokenData.accessLevel,
      exp: Math.floor(new Date(tokenData.expiresAt).getTime() / 1000),
      iat: Math.floor(Date.now() / 1000)
    };

    // Sign JWT
    return jwt.sign(payload, this.jwtSecret);
  }

  /**
   * Validate an emergency access token
   */
  async validateToken(token: string, options: {
    ipAddress?: string;
    checkExpiration?: boolean;
    checkUses?: boolean;
    checkIpRestrictions?: boolean;
  } = {}): Promise<TokenValidation> {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const tokenId = decoded.tokenId;

      // Get token data
      const tokenData = await this.getToken(tokenId);
      if (!tokenData) {
        return {
          valid: false,
          error: 'Token not found'
        };
      }

      // Check if revoked
      if (tokenData.revokedAt) {
        return {
          valid: false,
          error: 'Token has been revoked'
        };
      }

      // Check expiration
      if (options.checkExpiration !== false) {
        const now = new Date();
        const expiresAt = new Date(tokenData.expiresAt);
        if (now > expiresAt) {
          await this.logAccess({
            tokenId,
            contactId: tokenData.contactId,
            action: 'expired',
            success: false,
            ipAddress: options.ipAddress
          });
          return {
            valid: false,
            error: 'Token has expired'
          };
        }
      }

      // Check uses
      if (options.checkUses !== false && tokenData.currentUses >= tokenData.maxUses) {
        return {
          valid: false,
          error: 'Token has reached maximum uses'
        };
      }

      // Check IP restrictions
      if (options.checkIpRestrictions !== false && tokenData.ipRestrictions && options.ipAddress) {
        if (!tokenData.ipRestrictions.includes(options.ipAddress)) {
          await this.logAccess({
            tokenId,
            contactId: tokenData.contactId,
            action: 'failed',
            success: false,
            ipAddress: options.ipAddress,
            error: 'IP address not allowed'
          });
          return {
            valid: false,
            error: 'Access denied from this IP address'
          };
        }
      }

      // Get contact data
      const contact = await this.getContact(tokenData.contactId);
      if (!contact) {
        return {
          valid: false,
          error: 'Contact not found'
        };
      }

      const expiresAt = new Date(tokenData.expiresAt);
      const now = new Date();
      const expiresIn = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

      return {
        valid: true,
        token: tokenData,
        contact,
        remainingUses: tokenData.maxUses - tokenData.currentUses,
        expiresIn
      };

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token'
      };
    }
  }

  /**
   * Record token usage
   */
  async recordTokenUsage(tokenId: string, options: {
    ipAddress?: string;
    userAgent?: string;
    fileAccessed?: string;
  } = {}): Promise<void> {
    const tokenData = await this.getToken(tokenId);
    if (!tokenData) {
      throw new Error('Token not found');
    }

    // Update usage count
    tokenData.currentUses++;
    tokenData.usedAt = new Date().toISOString();
    await this.saveToken(tokenData);

    // Log access
    await this.logAccess({
      tokenId,
      contactId: tokenData.contactId,
      action: 'accessed',
      success: true,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      fileAccessed: options.fileAccessed
    });
  }

  /**
   * Revoke a token
   */
  async revokeToken(tokenId: string, reason?: string): Promise<void> {
    const tokenData = await this.getToken(tokenId);
    if (!tokenData) {
      throw new Error('Token not found');
    }

    tokenData.revokedAt = new Date().toISOString();
    await this.saveToken(tokenData);

    await this.logAccess({
      tokenId,
      contactId: tokenData.contactId,
      action: 'revoked',
      success: true,
      metadata: { reason }
    });
  }

  /**
   * Create or update emergency contact
   */
  async saveContact(contact: EmergencyContact): Promise<EmergencyContact> {
    await this.ensureDirectories();
    
    if (!contact.id) {
      contact.id = crypto.randomUUID();
      contact.createdAt = new Date().toISOString();
    }
    contact.updatedAt = new Date().toISOString();

    const filePath = path.join(this.dataDir, 'contacts', `${contact.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(contact, null, 2), 'utf-8');

    return contact;
  }

  /**
   * Get emergency contact
   */
  async getContact(contactId: string): Promise<EmergencyContact | null> {
    try {
      const filePath = path.join(this.dataDir, 'contacts', `${contactId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * List all contacts
   */
  async listContacts(): Promise<EmergencyContact[]> {
    try {
      await this.ensureDirectories();
      const files = await fs.readdir(path.join(this.dataDir, 'contacts'));
      const contacts = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async f => {
            const data = await fs.readFile(path.join(this.dataDir, 'contacts', f), 'utf-8');
            return JSON.parse(data) as EmergencyContact;
          })
      );
      return contacts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: string): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, 'contacts', `${contactId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error('Failed to delete contact');
    }
  }

  /**
   * Create or update contact group
   */
  async saveGroup(group: ContactGroup): Promise<ContactGroup> {
    await this.ensureDirectories();
    
    if (!group.id) {
      group.id = crypto.randomUUID();
      group.createdAt = new Date().toISOString();
    }
    group.updatedAt = new Date().toISOString();

    const filePath = path.join(this.dataDir, 'groups', `${group.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(group, null, 2), 'utf-8');

    return group;
  }

  /**
   * Get contact group
   */
  async getGroup(groupId: string): Promise<ContactGroup | null> {
    try {
      const filePath = path.join(this.dataDir, 'groups', `${groupId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * List all groups
   */
  async listGroups(): Promise<ContactGroup[]> {
    try {
      await this.ensureDirectories();
      const files = await fs.readdir(path.join(this.dataDir, 'groups'));
      const groups = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async f => {
            const data = await fs.readFile(path.join(this.dataDir, 'groups', f), 'utf-8');
            return JSON.parse(data) as ContactGroup;
          })
      );
      return groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * Get active tokens for a contact
   */
  async getContactTokens(contactId: string): Promise<EmergencyAccessToken[]> {
    try {
      await this.ensureDirectories();
      const files = await fs.readdir(path.join(this.dataDir, 'tokens'));
      const tokens = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async f => {
            const data = await fs.readFile(path.join(this.dataDir, 'tokens', f), 'utf-8');
            return JSON.parse(data) as EmergencyAccessToken;
          })
      );
      
      return tokens
        .filter(t => t.contactId === contactId && !t.revokedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * Get access logs
   */
  async getAccessLogs(options: {
    tokenId?: string;
    contactId?: string;
    action?: AccessLog['action'];
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<AccessLog[]> {
    try {
      const logFile = path.join(this.dataDir, 'logs', 'access.json');
      let logs: AccessLog[] = [];
      
      try {
        const data = await fs.readFile(logFile, 'utf-8');
        logs = JSON.parse(data);
      } catch (error) {
        // Log file doesn't exist yet
      }

      // Apply filters
      if (options.tokenId) {
        logs = logs.filter(l => l.tokenId === options.tokenId);
      }
      if (options.contactId) {
        logs = logs.filter(l => l.contactId === options.contactId);
      }
      if (options.action) {
        logs = logs.filter(l => l.action === options.action);
      }
      if (options.startDate) {
        logs = logs.filter(l => new Date(l.timestamp) >= options.startDate!);
      }
      if (options.endDate) {
        logs = logs.filter(l => new Date(l.timestamp) <= options.endDate!);
      }

      // Sort by timestamp descending
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply limit
      if (options.limit) {
        logs = logs.slice(0, options.limit);
      }

      return logs;
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const result = { cleaned: 0, errors: [] };
    
    try {
      await this.ensureDirectories();
      const files = await fs.readdir(path.join(this.dataDir, 'tokens'));
      const now = new Date();

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filePath = path.join(this.dataDir, 'tokens', file);
          const data = await fs.readFile(filePath, 'utf-8');
          const token = JSON.parse(data) as EmergencyAccessToken;
          
          const expiresAt = new Date(token.expiresAt);
          if (now > expiresAt) {
            await fs.unlink(filePath);
            result.cleaned++;
          }
        } catch (error) {
          result.errors.push(`Failed to process ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Save token data
   */
  private async saveToken(token: EmergencyAccessToken): Promise<void> {
    const filePath = path.join(this.dataDir, 'tokens', `${token.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(token, null, 2), 'utf-8');
  }

  /**
   * Get token data
   */
  private async getToken(tokenId: string): Promise<EmergencyAccessToken | null> {
    try {
      const filePath = path.join(this.dataDir, 'tokens', `${tokenId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Log access attempt
   */
  private async logAccess(log: Omit<AccessLog, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: AccessLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...log
    };

    const logFile = path.join(this.dataDir, 'logs', 'access.json');
    let logs: AccessLog[] = [];
    
    try {
      const data = await fs.readFile(logFile, 'utf-8');
      logs = JSON.parse(data);
    } catch (error) {
      // Log file doesn't exist yet
    }

    logs.push(logEntry);

    // Keep only last 10000 logs
    if (logs.length > 10000) {
      logs = logs.slice(-10000);
    }

    await fs.writeFile(logFile, JSON.stringify(logs, null, 2), 'utf-8');
  }
}

// Singleton instance
export const emergencyAccessService = new EmergencyAccessService();