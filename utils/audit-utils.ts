import { NextRequest } from 'next/server'
import { auditLoggingService, AuditEventContext } from '@/services/audit-logging-service'
import { AuditResult } from '@/types/data'

/**
 * Utility functions for easy audit logging integration
 */

/**
 * Log authentication events
 */
export async function logAuth(
  result: AuditResult,
  request?: NextRequest,
  userId?: string,
  details?: Record<string, any>
) {
  await auditLoggingService.logAuthentication(result, userId, request, details)
}

/**
 * Log emergency access events
 */
export async function logEmergencyAccess(
  action: string,
  resourceId?: string,
  result: AuditResult = 'success',
  details?: Record<string, any>,
  request?: NextRequest
) {
  await auditLoggingService.logEmergencyAccess(action, resourceId, result, details, request)
}

/**
 * Log file operations
 */
export async function logFileOp(
  action: string,
  fileId: string,
  result: AuditResult,
  request?: NextRequest,
  userId?: string,
  details?: Record<string, any>
) {
  await auditLoggingService.logFileOperation(action, fileId, result, userId, request, details)
}

/**
 * Log system access events
 */
export async function logSystemAccess(
  action: string,
  result: AuditResult,
  request?: NextRequest,
  details?: Record<string, any>
) {
  const context: AuditEventContext = {
    eventType: 'system_access',
    action,
    result,
    details,
    riskLevel: result === 'failure' ? 'medium' : 'low'
  }
  
  await auditLoggingService.logEvent(context, request)
}

/**
 * Log configuration changes
 */
export async function logConfigChange(
  action: string,
  resource: string,
  result: AuditResult,
  request?: NextRequest,
  userId?: string,
  details?: Record<string, any>
) {
  const context: AuditEventContext = {
    eventType: 'configuration_change',
    action,
    resource,
    result,
    details,
    riskLevel: 'medium',
    userId
  }
  
  await auditLoggingService.logEvent(context, request)
}

/**
 * Log backup operations
 */
export async function logBackupOp(
  action: string,
  result: AuditResult,
  request?: NextRequest,
  userId?: string,
  details?: Record<string, any>
) {
  const context: AuditEventContext = {
    eventType: 'backup_operation',
    action,
    result,
    details,
    riskLevel: 'low',
    userId
  }
  
  await auditLoggingService.logEvent(context, request)
}

/**
 * Log security events (suspicious activities, blocked attempts, etc.)
 */
export async function logSecurityEvent(
  action: string,
  result: AuditResult,
  request?: NextRequest,
  details?: Record<string, any>
) {
  const context: AuditEventContext = {
    eventType: 'security_event',
    action,
    result,
    details,
    riskLevel: result === 'blocked' || result === 'suspicious' ? 'high' : 'medium'
  }
  
  await auditLoggingService.logEvent(context, request)
}

/**
 * Log admin actions
 */
export async function logAdminAction(
  action: string,
  result: AuditResult,
  request?: NextRequest,
  userId?: string,
  details?: Record<string, any>
) {
  const context: AuditEventContext = {
    eventType: 'admin_action',
    action,
    result,
    details,
    riskLevel: 'high',
    userId
  }
  
  await auditLoggingService.logEvent(context, request)
}

/**
 * Extract session information from request headers
 */
export function extractSessionInfo(request: NextRequest): { sessionId?: string; userId?: string } {
  // Extract session ID from Authorization header or cookies
  const authHeader = request.headers.get('authorization')
  const sessionCookie = request.cookies.get('session')
  
  return {
    sessionId: sessionCookie?.value || extractSessionFromAuth(authHeader),
    userId: extractUserFromAuth(authHeader)
  }
}

/**
 * Helper to extract session ID from Authorization header
 */
function extractSessionFromAuth(authHeader: string | null): string | undefined {
  if (!authHeader) return undefined
  
  try {
    // Handle Bearer tokens or other session formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }
    return authHeader
  } catch {
    return undefined
  }
}

/**
 * Helper to extract user ID from Authorization header
 */
function extractUserFromAuth(authHeader: string | null): string | undefined {
  if (!authHeader) return undefined
  
  try {
    // In a real implementation, you'd decode the token/session to get user ID
    // For now, return a placeholder
    return 'system'
  } catch {
    return undefined
  }
}

/**
 * Create a middleware wrapper for automatic audit logging
 */
export function withAuditLogging(
  handler: (request: NextRequest) => Promise<Response>,
  options: {
    eventType?: string;
    action?: string;
    resource?: string;
  } = {}
) {
  return async (request: NextRequest): Promise<Response> => {
    const startTime = Date.now()
    const sessionInfo = extractSessionInfo(request)
    
    try {
      const response = await handler(request)
      
      // Log successful operations
      const context: AuditEventContext = {
        eventType: (options.eventType as any) || 'system_access',
        action: options.action || request.method,
        resource: options.resource,
        result: response.ok ? 'success' : 'failure',
        details: {
          method: request.method,
          url: request.url,
          statusCode: response.status,
          duration: Date.now() - startTime
        },
        ...sessionInfo
      }
      
      await auditLoggingService.logEvent(context, request)
      
      return response
    } catch (error) {
      // Log failed operations
      const context: AuditEventContext = {
        eventType: (options.eventType as any) || 'system_access',
        action: options.action || request.method,
        resource: options.resource,
        result: 'error',
        details: {
          method: request.method,
          url: request.url,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        },
        riskLevel: 'medium',
        ...sessionInfo
      }
      
      await auditLoggingService.logEvent(context, request)
      
      throw error
    }
  }
}