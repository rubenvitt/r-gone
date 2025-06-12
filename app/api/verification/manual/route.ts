import { NextRequest, NextResponse } from 'next/server';
import { verificationService } from '@/services/verification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      verificationId,
      reviewerId,
      decision,
      notes,
      confidenceOverride 
    } = body;

    if (!verificationId || !reviewerId || !decision) {
      return NextResponse.json({ 
        success: false, 
        error: 'Verification ID, reviewer ID, and decision are required' 
      }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(decision)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Decision must be either "approve" or "reject"' 
      }, { status: 400 });
    }

    if (confidenceOverride !== undefined) {
      if (typeof confidenceOverride !== 'number' || confidenceOverride < 0 || confidenceOverride > 100) {
        return NextResponse.json({ 
          success: false, 
          error: 'Confidence override must be a number between 0 and 100' 
        }, { status: 400 });
      }
    }

    if (decision === 'reject' && !notes) {
      return NextResponse.json({ 
        success: false, 
        error: 'Notes are required when rejecting a verification' 
      }, { status: 400 });
    }

    // Load verification system (this would load from storage)
    const verificationSystem = verificationService.createVerificationSystem();

    const updatedVerification = await verificationService.performManualVerification(
      verificationSystem,
      verificationId,
      reviewerId,
      decision,
      notes,
      confidenceOverride
    );

    return NextResponse.json({
      success: true,
      data: updatedVerification
    });

  } catch (error) {
    console.error('Error performing manual verification:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to perform manual verification' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const reviewerId = url.searchParams.get('reviewerId');
    const beneficiaryId = url.searchParams.get('beneficiaryId');
    const priority = url.searchParams.get('priority');

    // Get pending manual reviews
    const filters = {
      status: status || 'requires_manual_review',
      reviewerId,
      beneficiaryId,
      priority
    };

    // This would load and filter verification records requiring manual review
    return NextResponse.json({ 
      success: false, 
      error: 'Manual review queue listing not yet implemented',
      filters 
    }, { status: 501 });

  } catch (error) {
    console.error('Error retrieving manual review queue:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve manual review queue' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { verificationId, action, assignedTo, priority } = body;

    if (!verificationId || !action) {
      return NextResponse.json({ 
        success: false, 
        error: 'Verification ID and action are required' 
      }, { status: 400 });
    }

    if (!['assign', 'escalate', 'defer', 'request_info'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Action must be one of: assign, escalate, defer, request_info' 
      }, { status: 400 });
    }

    if (action === 'assign' && !assignedTo) {
      return NextResponse.json({ 
        success: false, 
        error: 'Assigned to is required when assigning verification' 
      }, { status: 400 });
    }

    // Implementation would update the verification record based on action
    return NextResponse.json({ 
      success: false, 
      error: `Manual verification ${action} not yet implemented` 
    }, { status: 501 });

  } catch (error) {
    console.error('Error updating manual verification:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update manual verification' 
    }, { status: 500 });
  }
}

// Manual verification guidelines and criteria
export const MANUAL_VERIFICATION_GUIDELINES = {
  identity: {
    criteria: [
      'Document authenticity (security features, format, issuing authority)',
      'Photo quality and clarity',
      'Face match between document and selfie (if provided)',
      'Document expiry date',
      'OCR data extraction accuracy',
      'Consistency of information across documents'
    ],
    redFlags: [
      'Poor image quality or resolution',
      'Signs of tampering or editing',
      'Expired documents',
      'Inconsistent information',
      'Face mismatch',
      'Suspicious metadata'
    ],
    approvalThreshold: 'High confidence required for identity verification'
  },
  document: {
    criteria: [
      'Document authenticity and official nature',
      'Relevance to claimed relationship or authority',
      'Date recency (where applicable)',
      'Proper signatures and notarization',
      'Jurisdictional validity',
      'Specific mention of digital assets (where relevant)'
    ],
    redFlags: [
      'Photocopies without certification',
      'Missing required signatures or seals',
      'Expired or outdated documents',
      'Irrelevant or insufficient authority',
      'Poor document quality',
      'Suspicious formatting or fonts'
    ],
    approvalThreshold: 'Medium to high confidence depending on document type'
  },
  geographic: {
    criteria: [
      'IP geolocation consistency',
      'VPN/proxy detection',
      'Device fingerprint analysis',
      'Historical location patterns',
      'Time zone consistency',
      'ISP reputation'
    ],
    redFlags: [
      'VPN or proxy usage',
      'Unusual geographic locations',
      'Inconsistent time zones',
      'Suspicious ISP or hosting provider',
      'Rapid location changes',
      'High-risk countries'
    ],
    approvalThreshold: 'Low to medium confidence acceptable with supporting verification'
  }
};

// Reviewer role definitions
export const REVIEWER_ROLES = {
  junior: {
    name: 'Junior Reviewer',
    permissions: ['review_basic', 'review_document'],
    restrictions: ['cannot_approve_high_risk', 'requires_senior_approval_above_threshold'],
    maxConfidenceOverride: 80
  },
  senior: {
    name: 'Senior Reviewer',
    permissions: ['review_all', 'assign_reviews', 'escalate'],
    restrictions: [],
    maxConfidenceOverride: 100
  },
  specialist: {
    name: 'Verification Specialist',
    permissions: ['review_all', 'final_decision', 'modify_workflows'],
    restrictions: [],
    maxConfidenceOverride: 100
  },
  admin: {
    name: 'System Administrator',
    permissions: ['review_all', 'system_configuration', 'audit_access'],
    restrictions: [],
    maxConfidenceOverride: 100
  }
};