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

    const integrityResult = await fileService.verifyFileIntegrity(fileId, userId)

    return NextResponse.json({
      success: true,
      integrity: integrityResult
    })
  } catch (error) {
    console.error('Failed to verify file integrity:', error)
    
    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to verify file integrity' },
      { status: 500 }
    )
  }
}