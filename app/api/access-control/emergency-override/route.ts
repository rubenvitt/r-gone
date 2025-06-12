import { NextRequest, NextResponse } from 'next/server';
import { accessControlService } from '@/services/access-control-service';
import { auditLoggingService } from '@/services/audit-logging-service';
import crypto from 'crypto';

interface EmergencyOverride {
  id: string;
  triggeredBy: string;
  reason: string;
  overrideType: 'full' | 'partial' | 'temporary';
  beneficiaryId?: string; // If override is for specific beneficiary
  resourceType?: string;  // If override is for specific resource type
  resourceId?: string;    // If override is for specific resource
  triggeredAt: string;
  expiresAt?: string;
  isActive: boolean;
  approvedBy?: string;
  approvedAt?: string;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
  conditions?: any[];
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      triggeredBy,
      reason,
      overrideType = 'temporary',
      beneficiaryId,
      resourceType,
      resourceId,
      expirationHours = 1, // Default 1 hour emergency override
      requiresApproval = true,
      emergencyCode 
    } = body;

    if (!triggeredBy || !reason) {
      return NextResponse.json({ 
        success: false, 
        error: 'Triggered by and reason are required' 
      }, { status: 400 });
    }

    if (!['full', 'partial', 'temporary'].includes(overrideType)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Override type must be one of: full, partial, temporary' 
      }, { status: 400 });
    }

    // Validate emergency code if provided (this would check against stored codes)
    if (emergencyCode) {
      const isValidCode = await validateEmergencyCode(emergencyCode, triggeredBy);
      if (!isValidCode) {
        await auditLoggingService.logEvent({
          eventType: 'security_event',
          action: 'invalid_emergency_code',
          resource: 'emergency_override',
          result: 'blocked',
          details: { triggeredBy, emergencyCode: 'REDACTED' },
          riskLevel: 'high',
          userId: triggeredBy
        });

        return NextResponse.json({ 
          success: false, 
          error: 'Invalid emergency code' 
        }, { status: 401 });
      }
    }

    const now = new Date();
    const expiresAt = expirationHours > 0 
      ? new Date(now.getTime() + (expirationHours * 60 * 60 * 1000)).toISOString()
      : undefined;

    const override: EmergencyOverride = {
      id: crypto.randomUUID(),
      triggeredBy,
      reason,
      overrideType,
      beneficiaryId,
      resourceType,
      resourceId,
      triggeredAt: now.toISOString(),
      expiresAt,
      isActive: !requiresApproval, // Active immediately if no approval required
      metadata: {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        emergencyCodeUsed: !!emergencyCode
      }
    };

    // Save the override (implementation would persist to storage)
    console.log('Creating emergency override:', override.id);

    // Log the emergency override
    await auditLoggingService.logEvent({
      eventType: 'emergency_access',
      action: 'create_emergency_override',
      resource: 'emergency_override',
      resourceId: override.id,
      result: 'success',
      details: {
        overrideType,
        beneficiaryId,
        resourceType,
        resourceId,
        expiresAt,
        requiresApproval
      },
      riskLevel: 'high',
      userId: triggeredBy
    });

    const response = {
      success: true,
      data: {
        ...override,
        message: requiresApproval 
          ? 'Emergency override created. Awaiting approval.'
          : 'Emergency override activated immediately.',
        status: requiresApproval ? 'pending_approval' : 'active'
      }
    };

    // If full override and no approval required, clear all access restrictions
    if (overrideType === 'full' && !requiresApproval) {
      // This would clear permission caches and grant full access
      console.log('Emergency full override activated - all restrictions bypassed');
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error creating emergency override:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create emergency override' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const overrideId = url.searchParams.get('id');
    const isActive = url.searchParams.get('isActive');
    const overrideType = url.searchParams.get('type');

    if (overrideId) {
      // Get specific override
      return NextResponse.json({ 
        success: false, 
        error: 'Override retrieval not yet implemented' 
      }, { status: 501 });
    } else {
      // List overrides with filters
      const filters = {
        isActive: isActive ? isActive === 'true' : undefined,
        overrideType
      };

      return NextResponse.json({ 
        success: false, 
        error: 'Override listing not yet implemented',
        filters 
      }, { status: 501 });
    }

  } catch (error) {
    console.error('Error retrieving emergency overrides:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve emergency overrides' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { overrideId, action, performedBy, reason } = body;

    if (!overrideId || !action || !performedBy) {
      return NextResponse.json({ 
        success: false, 
        error: 'Override ID, action, and performed by are required' 
      }, { status: 400 });
    }

    if (!['approve', 'revoke', 'extend'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Action must be one of: approve, revoke, extend' 
      }, { status: 400 });
    }

    // Implementation would:
    // 1. Load the emergency override
    // 2. Validate the action is allowed
    // 3. Update the override based on the action
    // 4. Log the action
    // 5. Update access permissions if necessary

    await auditLoggingService.logEvent({
      eventType: 'emergency_access',
      action: `${action}_emergency_override`,
      resource: 'emergency_override',
      resourceId: overrideId,
      result: 'success',
      details: { reason },
      riskLevel: 'high',
      userId: performedBy
    });

    return NextResponse.json({ 
      success: false, 
      error: `Emergency override ${action} not yet implemented` 
    }, { status: 501 });

  } catch (error) {
    console.error('Error updating emergency override:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update emergency override' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const overrideId = url.searchParams.get('id');
    const deletedBy = url.searchParams.get('deletedBy');

    if (!overrideId || !deletedBy) {
      return NextResponse.json({ 
        success: false, 
        error: 'Override ID and deleted by are required' 
      }, { status: 400 });
    }

    // Implementation would permanently delete the override
    await auditLoggingService.logEvent({
      eventType: 'emergency_access',
      action: 'delete_emergency_override',
      resource: 'emergency_override',
      resourceId: overrideId,
      result: 'success',
      riskLevel: 'high',
      userId: deletedBy
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Emergency override deletion not yet implemented' 
    }, { status: 501 });

  } catch (error) {
    console.error('Error deleting emergency override:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete emergency override' 
    }, { status: 500 });
  }
}

// Helper functions

async function validateEmergencyCode(code: string, userId: string): Promise<boolean> {
  // This would validate against stored emergency codes
  // Implementation would check:
  // 1. Code exists and is active
  // 2. Code hasn't expired
  // 3. User is authorized to use this code
  // 4. Code hasn't exceeded max usage
  
  // For now, accept any 6+ character code starting with 'EMERGENCY'
  return code.length >= 6 && code.startsWith('EMERGENCY');
}

// Utility function to check if emergency override is active
export function hasActiveEmergencyOverride(
  overrides: EmergencyOverride[],
  beneficiaryId?: string,
  resourceType?: string,
  resourceId?: string
): EmergencyOverride | null {
  const now = new Date();
  
  for (const override of overrides) {
    // Skip inactive or expired overrides
    if (!override.isActive) continue;
    if (override.expiresAt && new Date(override.expiresAt) <= now) continue;
    
    // Check if override applies
    if (override.overrideType === 'full') {
      return override; // Full override applies to everything
    }
    
    if (override.beneficiaryId && override.beneficiaryId !== beneficiaryId) {
      continue; // Override is for different beneficiary
    }
    
    if (override.resourceType && override.resourceType !== resourceType) {
      continue; // Override is for different resource type
    }
    
    if (override.resourceId && override.resourceId !== resourceId) {
      continue; // Override is for different resource
    }
    
    return override; // Override applies
  }
  
  return null;
}