import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function POST(request: NextRequest) {
  try {
    const {
      contactId,
      fileIds,
      accessLevel,
      expirationHours,
      maxUses,
      ipRestrictions,
      metadata
    } = await request.json();

    if (!contactId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contact ID is required' 
        },
        { status: 400 }
      );
    }

    // Validate access level
    if (accessLevel && !['view', 'download', 'full'].includes(accessLevel)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid access level. Must be view, download, or full' 
        },
        { status: 400 }
      );
    }

    // Validate expiration hours
    if (expirationHours !== undefined && (expirationHours < 1 || expirationHours > 8760)) { // 1 hour to 1 year
      return NextResponse.json(
        { 
          success: false, 
          error: 'Expiration hours must be between 1 and 8760 (1 year)' 
        },
        { status: 400 }
      );
    }

    // Validate max uses
    if (maxUses !== undefined && (maxUses < 1 || maxUses > 1000)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Max uses must be between 1 and 1000' 
        },
        { status: 400 }
      );
    }

    const result = await emergencyAccessService.generateToken({
      contactId,
      fileIds,
      accessLevel,
      expirationHours,
      maxUses,
      ipRestrictions,
      metadata
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Failed to generate token:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate token' 
      },
      { status: 500 }
    );
  }
}