import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService, ContactGroup } from '@/services/emergency-access-service';

export async function GET() {
  try {
    const groups = await emergencyAccessService.listGroups();
    
    return NextResponse.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Failed to list groups:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list contact groups' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const groupData: Partial<ContactGroup> = await request.json();
    
    // Validate required fields
    if (!groupData.name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Group name is required' 
        },
        { status: 400 }
      );
    }

    const group = await emergencyAccessService.saveGroup({
      ...groupData,
      contactIds: groupData.contactIds || [],
      defaultAccessLevel: groupData.defaultAccessLevel || 'view'
    } as ContactGroup);

    return NextResponse.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('Failed to save group:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save contact group' 
      },
      { status: 500 }
    );
  }
}