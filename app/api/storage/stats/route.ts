import { NextRequest, NextResponse } from 'next/server'
import { fileService, FileServiceError } from '@/services/file-service'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult.auth;

    const stats = await fileService.getStorageStats(userId)

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Failed to get storage stats:', error)
    
    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to get storage statistics' },
      { status: 500 }
    )
  }
}