import { NextRequest, NextResponse } from 'next/server'
import { fileService, FileServiceError } from '@/services/file-service'
import { requireAuth } from '@/lib/auth-middleware'

interface RouteParams {
  params: {
    fileId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult.auth;

    const { fileId } = params

    const metadata = await fileService.getFileMetadata(fileId, userId)

    return NextResponse.json({
      success: true,
      metadata
    })
  } catch (error) {
    console.error('Failed to get file metadata:', error)
    
    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to get file metadata' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult.auth;

    const { fileId } = params
    const body = await request.json()
    const { filename, description, tags } = body

    const updated = await fileService.updateMetadata(fileId, userId, {
      filename,
      description,
      tags
    })

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update metadata' },
        { status: 500 }
      )
    }

    // Return updated metadata
    const metadata = await fileService.getFileMetadata(fileId, userId)

    return NextResponse.json({
      success: true,
      metadata
    })
  } catch (error) {
    console.error('Failed to update file metadata:', error)
    
    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update file metadata' },
      { status: 500 }
    )
  }
}