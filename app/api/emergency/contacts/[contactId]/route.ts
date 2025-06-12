import { NextRequest, NextResponse } from 'next/server';
import { emergencyAccessService } from '@/services/emergency-access-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const { contactId } = params;
    const contact = await emergencyAccessService.getContact(contactId);
    
    if (!contact) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contact not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contact
    });
  } catch (error) {
    console.error(`Failed to get contact ${params.contactId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get contact' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const { contactId } = params;
    const updates = await request.json();
    
    const existingContact = await emergencyAccessService.getContact(contactId);
    if (!existingContact) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contact not found' 
        },
        { status: 404 }
      );
    }

    const updatedContact = await emergencyAccessService.saveContact({
      ...existingContact,
      ...updates,
      id: contactId
    });

    return NextResponse.json({
      success: true,
      contact: updatedContact
    });
  } catch (error) {
    console.error(`Failed to update contact ${params.contactId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update contact' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const { contactId } = params;
    await emergencyAccessService.deleteContact(contactId);

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error(`Failed to delete contact ${params.contactId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete contact' 
      },
      { status: 500 }
    );
  }
}