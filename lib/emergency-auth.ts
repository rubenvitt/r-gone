import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { emergencyAccessService } from '@/services/emergency-access-service';
import { checkEmergencyAccessRateLimit } from '@/lib/rate-limiter';

export interface EmergencyTokenPayload {
  tokenId: string;
  contactId: string;
  accessLevel: 'view' | 'download' | 'full';
  exp: number;
  iat: number;
}

export interface EmergencyAuthResult {
  success: boolean;
  payload?: EmergencyTokenPayload;
  tokenData?: any;
  error?: string;
}

/**
 * Validates emergency access token from Authorization header
 */
export async function validateEmergencyToken(request: NextRequest): Promise<EmergencyAuthResult> {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No valid authorization header found'
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Get IP address for rate limiting
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Check rate limiting
    const rateLimitCheck = checkEmergencyAccessRateLimit(ipAddress);
    if (rateLimitCheck.isLimited) {
      return {
        success: false,
        error: `Rate limit exceeded. ${rateLimitCheck.remainingAttempts} attempts remaining. Try again in ${Math.ceil(rateLimitCheck.resetTimeMs / 1000 / 60)} minutes.`
      };
    }
    
    // Validate the token using emergency access service
    const validation = await emergencyAccessService.validateToken(token, {
      ipAddress,
      checkExpiration: true,
      checkUses: true,
      checkIpRestrictions: false // More lenient for emergency access
    });

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid emergency access token'
      };
    }

    // Decode JWT to get payload (we know it's valid at this point)
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const payload = jwt.verify(token, jwtSecret) as EmergencyTokenPayload;

    return {
      success: true,
      payload,
      tokenData: validation.token
    };
  } catch (error) {
    console.error('Emergency token validation error:', error);
    return {
      success: false,
      error: 'Token validation failed'
    };
  }
}

/**
 * Checks if emergency access level allows specific action
 */
export function hasEmergencyPermission(
  accessLevel: 'view' | 'download' | 'full',
  requiredAction: 'view' | 'download' | 'modify'
): boolean {
  const permissions = {
    'view': ['view'],
    'download': ['view', 'download'],
    'full': ['view', 'download', 'modify']
  };

  return permissions[accessLevel]?.includes(requiredAction) || false;
}

/**
 * Logs emergency access attempt
 */
export async function logEmergencyAccess(
  tokenPayload: EmergencyTokenPayload,
  action: string,
  fileId?: string,
  success: boolean = true,
  error?: string
) {
  try {
    await emergencyAccessService.logAccess({
      tokenId: tokenPayload.tokenId,
      contactId: tokenPayload.contactId,
      action,
      success,
      error,
      metadata: {
        fileId,
        accessLevel: tokenPayload.accessLevel,
        timestamp: new Date().toISOString()
      }
    });
  } catch (logError) {
    console.error('Failed to log emergency access:', logError);
  }
}