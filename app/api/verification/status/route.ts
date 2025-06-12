import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const beneficiaryId = url.searchParams.get('beneficiaryId');
    const includeDetails = url.searchParams.get('includeDetails') === 'true';

    if (!sessionId && !beneficiaryId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session ID or beneficiary ID is required' 
      }, { status: 400 });
    }

    // Mock verification status data
    const verificationStatus = {
      sessionId: sessionId || 'mock-session-id',
      beneficiaryId: beneficiaryId || 'mock-beneficiary-id',
      overallStatus: 'in_progress',
      completionPercentage: 65,
      currentStep: 2,
      totalSteps: 3,
      startedAt: '2025-06-11T09:00:00Z',
      lastActivityAt: '2025-06-11T09:30:00Z',
      estimatedCompletionTime: '2025-06-11T10:00:00Z',
      verifications: [
        {
          id: 'ver-1',
          type: 'identity',
          method: 'government_id',
          status: 'completed',
          confidence: 92,
          completedAt: '2025-06-11T09:15:00Z'
        },
        {
          id: 'ver-2',
          type: 'document',
          method: 'death_certificate',
          status: 'requires_manual_review',
          confidence: 75,
          submittedAt: '2025-06-11T09:25:00Z'
        },
        {
          id: 'ver-3',
          type: 'geographic',
          method: 'ip_geolocation',
          status: 'pending',
          confidence: 0
        }
      ],
      nextSteps: [
        'Manual review of death certificate',
        'Geographic verification'
      ],
      issues: [
        {
          type: 'warning',
          message: 'Death certificate quality could be improved',
          verificationId: 'ver-2'
        }
      ]
    };

    if (includeDetails) {
      // Add detailed information about each verification
      verificationStatus.verifications = verificationStatus.verifications.map(v => ({
        ...v,
        details: {
          provider: v.type === 'identity' ? 'onfido' : 'internal',
          duration: v.status === 'completed' ? 900 : undefined, // seconds
          retryCount: 0,
          lastError: null
        }
      }));
    }

    return NextResponse.json({
      success: true,
      data: verificationStatus
    });

  } catch (error) {
    console.error('Error retrieving verification status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve verification status' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, status, notes } = body;

    if (!sessionId || !status) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session ID and status are required' 
      }, { status: 400 });
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'expired', 'suspended'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Mock status update
    const statusUpdate = {
      sessionId,
      previousStatus: 'in_progress',
      newStatus: status,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
      notes
    };

    return NextResponse.json({
      success: true,
      data: statusUpdate,
      message: 'Verification status updated successfully'
    });

  } catch (error) {
    console.error('Error updating verification status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update verification status' 
    }, { status: 500 });
  }
}

// Verification status definitions and transitions
export const STATUS_DEFINITIONS = {
  pending: {
    description: 'Verification session created but not yet started',
    allowedTransitions: ['in_progress', 'expired', 'suspended']
  },
  in_progress: {
    description: 'Verification actively being processed',
    allowedTransitions: ['completed', 'failed', 'requires_manual_review', 'suspended']
  },
  completed: {
    description: 'All verification steps completed successfully',
    allowedTransitions: ['expired'] // Can expire after time
  },
  failed: {
    description: 'Verification failed and cannot be completed',
    allowedTransitions: ['pending'] // Can restart
  },
  expired: {
    description: 'Verification session or results have expired',
    allowedTransitions: ['pending'] // Can restart
  },
  requires_manual_review: {
    description: 'Automated verification inconclusive, manual review needed',
    allowedTransitions: ['completed', 'failed', 'suspended']
  },
  suspended: {
    description: 'Verification temporarily suspended due to suspicious activity',
    allowedTransitions: ['in_progress', 'failed']
  }
};

// Verification progress tracking
export const PROGRESS_CALCULATION = {
  stepWeights: {
    identity: 40,
    document: 30,
    biometric: 15,
    geographic: 10,
    video: 20,
    manual: 10
  },
  confidenceThresholds: {
    low: 30,
    medium: 60,
    high: 80,
    maximum: 95
  },
  completionCriteria: {
    basic: ['identity'],
    enhanced: ['identity', 'document'],
    premium: ['identity', 'document', 'biometric'],
    maximum: ['identity', 'document', 'biometric', 'geographic', 'video']
  }
};