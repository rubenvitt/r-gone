import { NextRequest, NextResponse } from 'next/server';
import { verificationService } from '@/services/verification-service';
import { DocumentType } from '@/types/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, documents } = body;

    if (!sessionId || !documents || !Array.isArray(documents)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session ID and documents array are required' 
      }, { status: 400 });
    }

    if (documents.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'At least one document is required' 
      }, { status: 400 });
    }

    if (documents.length > 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Maximum 10 documents allowed per submission' 
      }, { status: 400 });
    }

    // Validate each document
    for (const doc of documents) {
      const validationError = validateDocument(doc);
      if (validationError) {
        return NextResponse.json({ 
          success: false, 
          error: validationError 
        }, { status: 400 });
      }
    }

    // Load verification system (this would load from storage)
    const verificationSystem = verificationService.createVerificationSystem();

    const verificationRecord = await verificationService.submitDocumentVerification(
      verificationSystem,
      sessionId,
      documents
    );

    return NextResponse.json({
      success: true,
      data: verificationRecord
    });

  } catch (error) {
    console.error('Error submitting document verification:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit document verification' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const verificationId = url.searchParams.get('id');
    const sessionId = url.searchParams.get('sessionId');
    const documentType = url.searchParams.get('type');
    const status = url.searchParams.get('status');

    if (verificationId) {
      // Get specific document verification
      return NextResponse.json({ 
        success: false, 
        error: 'Document verification retrieval not yet implemented' 
      }, { status: 501 });
    } else {
      // List document verifications
      const filters = {
        sessionId,
        documentType,
        status,
        type: 'document'
      };

      return NextResponse.json({ 
        success: false, 
        error: 'Document verification listing not yet implemented',
        filters 
      }, { status: 501 });
    }

  } catch (error) {
    console.error('Error retrieving document verifications:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve document verifications' 
    }, { status: 500 });
  }
}

function validateDocument(doc: any): string | null {
  if (!doc.type || !doc.filename || !doc.content || !doc.mimeType) {
    return 'Each document must have type, filename, content, and mimeType';
  }

  // Validate document type
  const validTypes: DocumentType[] = [
    'government_id', 'passport', 'drivers_license', 'birth_certificate',
    'death_certificate', 'marriage_certificate', 'divorce_decree',
    'power_of_attorney', 'will', 'court_order', 'utility_bill',
    'bank_statement', 'other'
  ];

  if (!validTypes.includes(doc.type)) {
    return `Invalid document type. Must be one of: ${validTypes.join(', ')}`;
  }

  // Validate MIME type
  const validMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf', 'image/tiff', 'image/webp'
  ];

  if (!validMimeTypes.includes(doc.mimeType)) {
    return `Invalid MIME type. Must be one of: ${validMimeTypes.join(', ')}`;
  }

  // Validate filename
  if (doc.filename.length > 255 || doc.filename.length < 1) {
    return 'Filename must be between 1 and 255 characters';
  }

  // Validate file extension matches MIME type
  const extension = doc.filename.toLowerCase().split('.').pop();
  const mimeTypeMapping: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf'],
    'image/tiff': ['tiff', 'tif'],
    'image/webp': ['webp']
  };

  const allowedExtensions = mimeTypeMapping[doc.mimeType] || [];
  if (!extension || !allowedExtensions.includes(extension)) {
    return `File extension does not match MIME type ${doc.mimeType}`;
  }

  // Validate base64 content
  try {
    const base64Data = doc.content.includes(',') ? doc.content.split(',')[1] : doc.content;
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      return 'File size cannot exceed 10MB';
    }

    // Check minimum size (1KB)
    if (buffer.length < 1024) {
      return 'File size must be at least 1KB';
    }

  } catch {
    return 'Invalid base64 content';
  }

  return null;
}

// Document type requirements and descriptions
export const DOCUMENT_REQUIREMENTS = {
  death_certificate: {
    description: 'Official death certificate issued by government authority',
    requiredFor: ['estate_access', 'beneficiary_verification'],
    acceptedFormats: ['pdf', 'jpg', 'png'],
    notes: 'Must be certified copy or original. Photocopies may require additional verification.'
  },
  power_of_attorney: {
    description: 'Legal document granting authority to act on behalf of another person',
    requiredFor: ['legal_representative_access'],
    acceptedFormats: ['pdf', 'jpg', 'png'],
    notes: 'Must be notarized and include specific authority for digital asset access.'
  },
  court_order: {
    description: 'Court order granting access to digital assets or information',
    requiredFor: ['court_ordered_access'],
    acceptedFormats: ['pdf', 'jpg', 'png'],
    notes: 'Must be from competent jurisdiction and specifically mention digital assets.'
  },
  will: {
    description: 'Last will and testament naming beneficiary or executor',
    requiredFor: ['inheritance_verification'],
    acceptedFormats: ['pdf', 'jpg', 'png'],
    notes: 'Must be probated or include self-proving affidavit where applicable.'
  },
  government_id: {
    description: 'Government-issued photo identification',
    requiredFor: ['identity_verification'],
    acceptedFormats: ['jpg', 'png'],
    notes: 'Both front and back required for cards. Must be current and not expired.'
  },
  utility_bill: {
    description: 'Recent utility bill for address verification',
    requiredFor: ['address_verification'],
    acceptedFormats: ['pdf', 'jpg', 'png'],
    notes: 'Must be dated within last 3 months and show current address.'
  },
  bank_statement: {
    description: 'Recent bank statement for financial verification',
    requiredFor: ['financial_verification'],
    acceptedFormats: ['pdf', 'jpg', 'png'],
    notes: 'Must be dated within last 3 months. Account numbers may be redacted.'
  }
};