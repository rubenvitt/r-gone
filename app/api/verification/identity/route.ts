import { NextRequest, NextResponse } from 'next/server';
import { verificationService } from '@/services/verification-service';
import { VerificationMethod } from '@/types/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sessionId,
      method,
      providerId,
      documentData,
      options 
    } = body;

    // Validate required fields
    if (!sessionId || !method || !providerId || !documentData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session ID, method, provider ID, and document data are required' 
      }, { status: 400 });
    }

    // Validate method
    const validMethods: VerificationMethod[] = [
      'government_id', 'passport', 'drivers_license'
    ];

    if (!validMethods.includes(method)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid verification method. Must be one of: ${validMethods.join(', ')}` 
      }, { status: 400 });
    }

    // Validate document data structure
    if (!documentData.type || !documentData.frontImage) {
      return NextResponse.json({ 
        success: false, 
        error: 'Document type and front image are required' 
      }, { status: 400 });
    }

    // Validate base64 images
    if (!isValidBase64Image(documentData.frontImage)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid front image format' 
      }, { status: 400 });
    }

    if (documentData.backImage && !isValidBase64Image(documentData.backImage)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid back image format' 
      }, { status: 400 });
    }

    if (documentData.selfieImage && !isValidBase64Image(documentData.selfieImage)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid selfie image format' 
      }, { status: 400 });
    }

    // Load verification system (this would load from storage)
    const verificationSystem = verificationService.createVerificationSystem();

    const verificationRecord = await verificationService.submitIdentityVerification(
      verificationSystem,
      sessionId,
      method,
      providerId,
      documentData,
      options
    );

    return NextResponse.json({
      success: true,
      data: verificationRecord
    });

  } catch (error) {
    console.error('Error submitting identity verification:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit identity verification' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const verificationId = url.searchParams.get('id');
    const sessionId = url.searchParams.get('sessionId');
    const status = url.searchParams.get('status');

    if (verificationId) {
      // Get specific verification
      return NextResponse.json({ 
        success: false, 
        error: 'Verification retrieval not yet implemented' 
      }, { status: 501 });
    } else {
      // List identity verifications
      const filters = {
        sessionId,
        status,
        type: 'identity'
      };

      return NextResponse.json({ 
        success: false, 
        error: 'Identity verification listing not yet implemented',
        filters 
      }, { status: 501 });
    }

  } catch (error) {
    console.error('Error retrieving identity verifications:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve identity verifications' 
    }, { status: 500 });
  }
}

// Helper function to validate base64 image
function isValidBase64Image(base64String: string): boolean {
  try {
    // Check if it's a valid base64 string
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif);base64,/;
    if (!base64Regex.test(base64String)) {
      return false;
    }

    // Extract base64 data
    const base64Data = base64String.split(',')[1];
    if (!base64Data) {
      return false;
    }

    // Try to decode to verify it's valid base64
    Buffer.from(base64Data, 'base64');
    
    // Check minimum size (1KB)
    return base64Data.length > 1000;
  } catch {
    return false;
  }
}

// Supported identity verification providers
export const SUPPORTED_PROVIDERS = [
  {
    id: 'onfido',
    name: 'Onfido',
    supportedMethods: ['government_id', 'passport', 'drivers_license'],
    features: ['face_match', 'liveness_check', 'document_authenticity']
  },
  {
    id: 'jumio',
    name: 'Jumio',
    supportedMethods: ['government_id', 'passport', 'drivers_license'],
    features: ['face_match', 'liveness_check', 'document_authenticity']
  },
  {
    id: 'trulioo',
    name: 'Trulioo',
    supportedMethods: ['government_id', 'passport'],
    features: ['global_coverage', 'aml_screening']
  }
];