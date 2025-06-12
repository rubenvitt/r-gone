import { NextRequest, NextResponse } from 'next/server'
import { fileService, FileServiceError } from '@/services/file-service'

interface RouteParams {
  params: {
    fileId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { fileId } = params

    const metadata = await fileService.getFileMetadata(fileId)

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