import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService, EmergencyContact } from '@/services/emergency-access-service';

export async function GET() {
  try {
    const contacts = await emergencyAccessService.listContacts();
    
    return NextResponse.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Failed to list contacts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list emergency contacts' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contactData: Partial<EmergencyContact> = await request.json();
    
    // Validate required fields
    if (!contactData.name || !contactData.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name and email are required' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactData.email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    const contact = await emergencyAccessService.saveContact({
      ...contactData,
      defaultAccessLevel: contactData.defaultAccessLevel || 'view'
    } as EmergencyContact);

    return NextResponse.json({
      success: true,
      contact
    });
  } catch (error) {
    console.error('Failed to save contact:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save emergency contact' 
      },
      { status: 500 }
    );
  }
}