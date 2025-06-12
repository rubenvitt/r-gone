import { NextRequest, NextResponse } from 'next/server'
import { fileService, FileServiceError } from '@/services/file-service'
import { validateEmergencyToken, hasEmergencyPermission, logEmergencyAccess } from '@/lib/emergency-auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const sortBy = searchParams.get('sortBy') as 'createdAt' | 'updatedAt' | 'filename' | 'size' || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    const search = searchParams.get('search') || undefined
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined

    // Check for emergency access token
    const authHeader = request.headers.get('Authorization');
    let isEmergencyAccess = false;
    let emergencyPayload = null;
    let allowedFileIds: string[] | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // This might be an emergency access request
      const emergencyAuth = await validateEmergencyToken(request);
      
      if (emergencyAuth.success) {
        isEmergencyAccess = true;
        emergencyPayload = emergencyAuth.payload;
        
        // Check if emergency access allows viewing files
        if (!hasEmergencyPermission(emergencyPayload.accessLevel, 'view')) {
          await logEmergencyAccess(emergencyPayload, 'list_denied', undefined, false, 'Insufficient permissions');
          return NextResponse.json(
            { success: false, error: 'Insufficient emergency access permissions' },
            { status: 403 }
          );
        }

        // Get allowed file IDs from token (if any restrictions)
        if (emergencyAuth.tokenData?.fileIds && emergencyAuth.tokenData.fileIds.length > 0) {
          allowedFileIds = emergencyAuth.tokenData.fileIds;
        }
      } else {
        // Invalid emergency token
        return NextResponse.json(
          { success: false, error: emergencyAuth.error || 'Invalid emergency access token' },
          { status: 401 }
        );
      }
    }

    // If not emergency access, check for regular authentication here
    // For now, we'll allow access if no emergency token (backward compatibility)
    if (!isEmergencyAccess) {
      // TODO: Add regular user authentication check here
      // For now, allow access for backward compatibility
    }

    const files = await fileService.listFiles({
      sortBy,
      sortOrder,
      search,
      tags
    })

    // Filter files for emergency access if restrictions apply
    let filteredFiles = files;
    if (isEmergencyAccess && allowedFileIds) {
      filteredFiles = files.filter(file => allowedFileIds!.includes(file.id));
    }

    // Log successful emergency access
    if (isEmergencyAccess && emergencyPayload) {
      await logEmergencyAccess(emergencyPayload, 'list', undefined, true);
    }

    return NextResponse.json({
      success: true,
      files: filteredFiles,
      count: filteredFiles.length
    })
  } catch (error) {
    console.error('Failed to list files:', error)
    
    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to list files' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { encryptedContent, filename, description, tags, fileId } = body

    if (!encryptedContent || typeof encryptedContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Encrypted content is required' },
        { status: 400 }
      )
    }

    const result = await fileService.saveEncryptedData(encryptedContent, {
      fileId,
      filename,
      description,
      tags
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Save failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      version: result.version
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to save file:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to save file' },
      { status: 500 }
    )
  }
}