import { NextResponse } from 'next/server'
import { fileService, FileServiceError } from '@/services/file-service'

export async function GET() {
  try {
    const stats = await fileService.getStorageStats()

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