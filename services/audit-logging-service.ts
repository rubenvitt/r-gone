import { 
  AuditLogEntry, 
  AuditEventType, 
  AuditResult, 
  RiskLevel, 
  AuditLogFilter,
  AuditLogAnalytics,
  AuditConfiguration 
} from '@/types/data'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

export interface AuditEventContext {
  eventType: AuditEventType;
  action: string;
  resource?: string;
  resourceId?: string;
  result: AuditResult;
  details?: Record<string, any>;
  riskLevel?: RiskLevel;
  userId?: string;
  sessionId?: string;
}

export class AuditLoggingService {
  private static instance: AuditLoggingService
  private logDirectory: string
  private configuration: AuditConfiguration

  constructor() {
    this.logDirectory = process.cwd() + '/data/audit-logs'
    this.configuration = this.getDefaultConfiguration()
    this.ensureLogDirectory()
  }

  public static getInstance(): AuditLoggingService {
    if (!AuditLoggingService.instance) {
      AuditLoggingService.instance = new AuditLoggingService()
    }
    return AuditLoggingService.instance
  }

  /**
   * Log an audit event with full context and tamper-evident features
   */
  async logEvent(context: AuditEventContext, request?: NextRequest): Promise<void> {
    if (!this.configuration.enabled) {
      return
    }

    try {
      const entry = await this.createAuditEntry(context, request)
      await this.persistLogEntry(entry)
      
      // Check for suspicious activity
      if (entry.riskLevel === 'high' || entry.riskLevel === 'critical') {
        await this.handleHighRiskEvent(entry)
      }
    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw to avoid breaking the main application flow
    }
  }

  /**
   * Log authentication events with additional security context
   */
  async logAuthentication(
    result: AuditResult, 
    userId?: string, 
    request?: NextRequest,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      eventType: 'authentication',
      action: 'login_attempt',
      result,
      details: {
        ...details,
        method: details?.method || 'passphrase'
      },
      riskLevel: result === 'failure' ? 'medium' : 'low',
      userId,
      sessionId: details?.sessionId
    }, request)
  }

  /**
   * Log emergency access events with elevated tracking
   */
  async logEmergencyAccess(
    action: string,
    resourceId?: string,
    result: AuditResult = 'success',
    details?: Record<string, any>,
    request?: NextRequest
  ): Promise<void> {
    await this.logEvent({
      eventType: 'emergency_access',
      action,
      resource: 'emergency_token',
      resourceId,
      result,
      details,
      riskLevel: 'high',
      sessionId: details?.sessionId
    }, request)
  }

  /**
   * Log file operations with data sensitivity awareness
   */
  async logFileOperation(
    action: string,
    fileId: string,
    result: AuditResult,
    userId?: string,
    request?: NextRequest,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      eventType: 'file_operation',
      action,
      resource: 'encrypted_file',
      resourceId: fileId,
      result,
      details,
      riskLevel: action.includes('decrypt') ? 'medium' : 'low',
      userId,
      sessionId: details?.sessionId
    }, request)
  }

  /**
   * Retrieve audit logs with filtering and pagination
   */
  async getLogs(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      const files = await fs.readdir(this.logDirectory)
      const logFiles = files.filter(f => f.endsWith('.json')).sort().reverse()
      
      let logs: AuditLogEntry[] = []
      
      for (const file of logFiles) {
        const filePath = path.join(this.logDirectory, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const fileLogs: AuditLogEntry[] = JSON.parse(content)
        logs.push(...fileLogs)
        
        if (filter.limit && logs.length >= filter.limit) {
          break
        }
      }
      
      // Apply filters
      logs = this.applyFilters(logs, filter)
      
      // Apply pagination
      const offset = filter.offset || 0
      const limit = filter.limit || 100
      
      return logs.slice(offset, offset + limit)
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error)
      return []
    }
  }

  /**
   * Generate analytics from audit logs
   */
  async getAnalytics(filter: AuditLogFilter = {}): Promise<AuditLogAnalytics> {
    const logs = await this.getLogs({ ...filter, limit: undefined })
    
    const analytics: AuditLogAnalytics = {
      totalEvents: logs.length,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsByResult: {} as Record<AuditResult, number>,
      eventsByRiskLevel: {} as Record<RiskLevel, number>,
      uniqueUsers: new Set(logs.map(l => l.userId).filter(Boolean)).size,
      uniqueIPs: new Set(logs.map(l => l.ipAddress).filter(Boolean)).size,
      suspiciousActivities: logs.filter(l => l.result === 'suspicious').length,
      topResources: [],
      timeDistribution: []
    }
    
    // Calculate distributions
    logs.forEach(log => {
      analytics.eventsByType[log.eventType] = (analytics.eventsByType[log.eventType] || 0) + 1
      analytics.eventsByResult[log.result] = (analytics.eventsByResult[log.result] || 0) + 1
      analytics.eventsByRiskLevel[log.riskLevel] = (analytics.eventsByRiskLevel[log.riskLevel] || 0) + 1
    })
    
    // Calculate top resources
    const resourceCounts = new Map<string, number>()
    logs.forEach(log => {
      if (log.resource) {
        resourceCounts.set(log.resource, (resourceCounts.get(log.resource) || 0) + 1)
      }
    })
    
    analytics.topResources = Array.from(resourceCounts.entries())
      .map(([resource, count]) => ({ resource, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    // Calculate time distribution
    const hourCounts = new Array(24).fill(0)
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours()
      hourCounts[hour]++
    })
    
    analytics.timeDistribution = hourCounts.map((count, hour) => ({ hour, count }))
    
    return analytics
  }

  /**
   * Export audit logs in various formats for compliance
   */
  async exportLogs(filter: AuditLogFilter = {}, format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
    const logs = await this.getLogs(filter)
    
    switch (format) {
      case 'csv':
        return this.exportToCSV(logs)
      case 'xml':
        return this.exportToXML(logs)
      default:
        return JSON.stringify(logs, null, 2)
    }
  }

  /**
   * Verify the integrity of audit logs
   */
  async verifyLogIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    try {
      const logs = await this.getLogs({ limit: undefined })
      
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i]
        const calculatedHash = this.calculateLogHash(log)
        
        if (log.hash !== calculatedHash) {
          errors.push(`Log entry ${log.id} has invalid hash`)
        }
        
        if (i > 0 && log.previousHash !== logs[i - 1].hash) {
          errors.push(`Log entry ${log.id} has invalid previous hash`)
        }
      }
    } catch (error) {
      errors.push(`Failed to verify log integrity: ${error}`)
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Clean up old logs based on retention policy
   */
  async cleanupOldLogs(): Promise<void> {
    if (typeof window !== 'undefined') {
      // Running in browser, skip file operations
      return
    }
    
    if (this.configuration.retentionPeriodDays <= 0) {
      return
    }
    
    try {
      const { readdir, stat, unlink } = await import('fs/promises')
      const { join } = await import('path')
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.configuration.retentionPeriodDays)
      
      const files = await readdir(this.logDirectory)
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        
        const filePath = join(this.logDirectory, file)
        const stats = await stat(filePath)
        
        if (stats.mtime < cutoffDate) {
          await unlink(filePath)
          console.log(`Deleted old log file: ${file}`)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
    }
  }

  // Private methods

  private async createAuditEntry(context: AuditEventContext, request?: NextRequest): Promise<AuditLogEntry> {
    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()
    
    // Extract request information
    let ipAddress: string | undefined
    let userAgent: string | undefined
    let location: any = undefined
    
    if (request) {
      ipAddress = this.extractIPAddress(request)
      userAgent = request.headers.get('user-agent') || undefined
      
      if (this.configuration.enableGeolocation && ipAddress) {
        location = await this.getGeolocation(ipAddress)
      }
    }
    
    // Get previous log for chaining
    const previousHash = await this.getLastLogHash()
    
    const entry: Omit<AuditLogEntry, 'hash'> = {
      id,
      timestamp,
      eventType: context.eventType,
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress,
      userAgent,
      resource: context.resource,
      resourceId: context.resourceId,
      action: context.action,
      result: context.result,
      details: context.details,
      riskLevel: context.riskLevel || this.calculateRiskLevel(context),
      location,
      previousHash
    }
    
    const hash = this.calculateLogHash(entry)
    
    return {
      ...entry,
      hash
    }
  }

  private calculateLogHash(entry: Omit<AuditLogEntry, 'hash'>): string {
    const hashContent = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      action: entry.action,
      result: entry.result,
      previousHash: entry.previousHash
    })
    
    return crypto.createHash('sha256').update(hashContent).digest('hex')
  }

  private async getLastLogHash(): Promise<string | undefined> {
    if (typeof window !== 'undefined') {
      // Running in browser, return undefined
      return undefined
    }
    
    try {
      const { readdir, readFile } = await import('fs/promises')
      const { join } = await import('path')
      
      const files = await readdir(this.logDirectory)
      const logFiles = files.filter(f => f.endsWith('.json')).sort()
      
      if (logFiles.length === 0) {
        return undefined
      }
      
      const lastFile = logFiles[logFiles.length - 1]
      const filePath = join(this.logDirectory, lastFile)
      const content = await readFile(filePath, 'utf-8')
      const logs: AuditLogEntry[] = JSON.parse(content)
      
      return logs.length > 0 ? logs[logs.length - 1].hash : undefined
    } catch {
      return undefined
    }
  }

  private async persistLogEntry(entry: AuditLogEntry): Promise<void> {
    if (typeof window !== 'undefined') {
      // Running in browser, skip file operations
      return
    }
    
    const { readFile, writeFile } = await import('fs/promises')
    const { join } = await import('path')
    
    const date = new Date(entry.timestamp)
    const fileName = `audit-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.json`
    const filePath = join(this.logDirectory, fileName)
    
    let logs: AuditLogEntry[] = []
    
    try {
      const content = await readFile(filePath, 'utf-8')
      logs = JSON.parse(content)
    } catch {
      // File doesn't exist, start with empty array
    }
    
    logs.push(entry)
    
    await writeFile(filePath, JSON.stringify(logs, null, 2))
  }

  private extractIPAddress(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    return request.headers.get('x-real-ip') || 
           request.headers.get('cf-connecting-ip') || 
           request.ip || 
           'unknown'
  }

  private async getGeolocation(ipAddress: string): Promise<any> {
    if (ipAddress === 'unknown' || ipAddress.startsWith('127.') || ipAddress.startsWith('192.168.')) {
      return {
        country: 'Local',
        region: 'Local',
        city: 'Local'
      }
    }
    
    // In production, you would integrate with a geolocation service
    // For now, return a placeholder
    return {
      country: 'Unknown',
      region: 'Unknown', 
      city: 'Unknown'
    }
  }

  private calculateRiskLevel(context: AuditEventContext): RiskLevel {
    if (context.result === 'failure' && context.eventType === 'authentication') {
      return 'medium'
    }
    
    if (context.eventType === 'emergency_access') {
      return 'high'
    }
    
    if (context.result === 'blocked' || context.result === 'suspicious') {
      return 'high'
    }
    
    return 'low'
  }

  private async handleHighRiskEvent(entry: AuditLogEntry): Promise<void> {
    // In production, this would trigger alerts, notifications, etc.
    console.warn('High risk audit event detected:', {
      id: entry.id,
      eventType: entry.eventType,
      action: entry.action,
      riskLevel: entry.riskLevel,
      ipAddress: entry.ipAddress
    })
  }

  private applyFilters(logs: AuditLogEntry[], filter: AuditLogFilter): AuditLogEntry[] {
    return logs.filter(log => {
      if (filter.startDate && log.timestamp < filter.startDate) return false
      if (filter.endDate && log.timestamp > filter.endDate) return false
      if (filter.eventType && log.eventType !== filter.eventType) return false
      if (filter.result && log.result !== filter.result) return false
      if (filter.riskLevel && log.riskLevel !== filter.riskLevel) return false
      if (filter.userId && log.userId !== filter.userId) return false
      if (filter.ipAddress && log.ipAddress !== filter.ipAddress) return false
      if (filter.resource && log.resource !== filter.resource) return false
      
      return true
    })
  }

  private exportToCSV(logs: AuditLogEntry[]): string {
    const headers = [
      'ID', 'Timestamp', 'Event Type', 'Action', 'Result', 'Risk Level',
      'User ID', 'IP Address', 'Resource', 'Resource ID'
    ]
    
    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.eventType,
      log.action,
      log.result,
      log.riskLevel,
      log.userId || '',
      log.ipAddress || '',
      log.resource || '',
      log.resourceId || ''
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  private exportToXML(logs: AuditLogEntry[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<audit_logs>\n'
    
    logs.forEach(log => {
      xml += '  <log>\n'
      xml += `    <id>${log.id}</id>\n`
      xml += `    <timestamp>${log.timestamp}</timestamp>\n`
      xml += `    <event_type>${log.eventType}</event_type>\n`
      xml += `    <action>${log.action}</action>\n`
      xml += `    <result>${log.result}</result>\n`
      xml += `    <risk_level>${log.riskLevel}</risk_level>\n`
      if (log.userId) xml += `    <user_id>${log.userId}</user_id>\n`
      if (log.ipAddress) xml += `    <ip_address>${log.ipAddress}</ip_address>\n`
      if (log.resource) xml += `    <resource>${log.resource}</resource>\n`
      if (log.resourceId) xml += `    <resource_id>${log.resourceId}</resource_id>\n`
      xml += '  </log>\n'
    })
    
    xml += '</audit_logs>'
    return xml
  }

  private async ensureLogDirectory(): Promise<void> {
    if (typeof window !== 'undefined') {
      // Running in browser, skip file operations
      return
    }
    
    try {
      const { access, mkdir } = await import('fs/promises')
      await access(this.logDirectory)
    } catch {
      const { mkdir } = await import('fs/promises')
      await mkdir(this.logDirectory, { recursive: true })
    }
  }

  private getDefaultConfiguration(): AuditConfiguration {
    return {
      enabled: true,
      retentionPeriodDays: 365,
      maxLogSize: 100 * 1024 * 1024, // 100MB
      enableGeolocation: false,
      enableFingerprinting: false,
      riskThresholds: {
        failedLoginAttempts: 5,
        suspiciousLocationChange: true,
        rapidRequestThreshold: 100
      },
      alerting: {
        enabled: false,
        channels: [],
        highRiskThreshold: 10,
        criticalRiskThreshold: 5
      },
      compliance: {
        gdprCompliant: true,
        hipaaCompliant: false,
        exportFormat: ['json', 'csv']
      }
    }
  }
}

// Export singleton instance
export const auditLoggingService = AuditLoggingService.getInstance()