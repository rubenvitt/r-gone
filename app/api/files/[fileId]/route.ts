import { NextRequest, NextResponse } from 'next/server'
import { fileService, FileServiceError } from '@/services/file-service'
import { validateEmergencyToken, hasEmergencyPermission, logEmergencyAccess } from '@/lib/emergency-auth'
import { decryptData } from '@/lib/pgp'

interface RouteParams {
  params: {
    fileId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { fileId } = params

    // Check for emergency access token
    const authHeader = request.headers.get('Authorization');
    let isEmergencyAccess = false;
    let emergencyPayload = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // This might be an emergency access request
      const emergencyAuth = await validateEmergencyToken(request);
      
      if (emergencyAuth.success) {
        isEmergencyAccess = true;
        emergencyPayload = emergencyAuth.payload;
        
        // Check if emergency access allows viewing files
        if (!hasEmergencyPermission(emergencyPayload.accessLevel, 'view')) {
          await logEmergencyAccess(emergencyPayload, 'view_denied', fileId, false, 'Insufficient permissions');
          return NextResponse.json(
            { success: false, error: 'Insufficient emergency access permissions' },
            { status: 403 }
          );
        }

        // Check if this specific file is allowed (if token has file restrictions)
        if (emergencyAuth.tokenData?.fileIds && 
            emergencyAuth.tokenData.fileIds.length > 0 && 
            !emergencyAuth.tokenData.fileIds.includes(fileId)) {
          await logEmergencyAccess(emergencyPayload, 'view_denied', fileId, false, 'File not in allowed list');
          return NextResponse.json(
            { success: false, error: 'File not accessible with this emergency token' },
            { status: 403 }
          );
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

    const fileData = await fileService.getEncryptedData(fileId)
    
    if (!fileData) {
      if (isEmergencyAccess && emergencyPayload) {
        await logEmergencyAccess(emergencyPayload, 'view_failed', fileId, false, 'File not found');
      }
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      )
    }

    // Also get metadata
    const metadata = await fileService.getFileMetadata(fileId)

    // Log successful emergency access
    if (isEmergencyAccess && emergencyPayload) {
      await logEmergencyAccess(emergencyPayload, 'view', fileId, true);
    }

    let responseContent = fileData.encryptedContent;
    
    // For emergency access, try to decrypt the content if we have a master passphrase
    if (isEmergencyAccess && emergencyPayload) {
      try {
        // Check if content is encrypted
        if (responseContent.includes('-----BEGIN PGP MESSAGE-----')) {
          // Try to get emergency passphrase from environment or emergency config
          const emergencyPassphrase = process.env.EMERGENCY_MASTER_PASSPHRASE;
          
          if (emergencyPassphrase) {
            console.log('Attempting emergency decryption for file:', fileId);
            const decryptedContent = await decryptData(responseContent, emergencyPassphrase);
            
            if (decryptedContent) {
              // Parse the decrypted data and extract readable content
              try {
                const parsedData = JSON.parse(decryptedContent as string);
                
                // Extract readable content from the structured data
                let readableContent = '';
                
                if (parsedData.notes && Array.isArray(parsedData.notes)) {
                  // Multi-note format
                  readableContent = parsedData.notes.map((note: { title?: string; content?: string }) => {
                    return `# ${note.title || 'Untitled'}\n\n${note.content || ''}`;
                  }).join('\n\n---\n\n');
                } else if (parsedData.sections && Array.isArray(parsedData.sections)) {
                  // Legacy sections format
                  readableContent = parsedData.sections.map((section: { title?: string; content?: string | string[] }) => {
                    const content = Array.isArray(section.content) ? section.content.join('\n') : section.content;
                    return `# ${section.title || 'Untitled'}\n\n${content || ''}`;
                  }).join('\n\n---\n\n');
                } else {
                  // Plain text or unknown format
                  readableContent = decryptedContent as string;
                }
                
                responseContent = readableContent;
                await logEmergencyAccess(emergencyPayload, 'decrypted', fileId, true, 'Content successfully decrypted for emergency access');
              } catch {
                // If parsing fails, return the decrypted content as-is
                responseContent = decryptedContent as string;
                await logEmergencyAccess(emergencyPayload, 'decrypted', fileId, true, 'Content decrypted but could not parse structure');
              }
            } else {
              await logEmergencyAccess(emergencyPayload, 'decrypt_failed', fileId, false, 'Emergency decryption failed - invalid passphrase');
            }
          } else {
            await logEmergencyAccess(emergencyPayload, 'decrypt_failed', fileId, false, 'No emergency master passphrase configured');
          }
        }
      } catch (decryptError) {
        console.error('Emergency decryption error:', decryptError);
        await logEmergencyAccess(emergencyPayload, 'decrypt_failed', fileId, false, `Decryption error: ${decryptError instanceof Error ? decryptError.message : 'Unknown error'}`);
        // Continue with encrypted content if decryption fails
      }
    }

    return NextResponse.json({
      success: true,
      content: responseContent,
      metadata,
      filename: metadata?.filename || `file-${fileId}`,
      decrypted: isEmergencyAccess && !responseContent.includes('-----BEGIN PGP MESSAGE-----')
    })
  } catch (error) {
    console.error('Failed to get file:', error)
    
    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to get file' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { fileId } = params
    const body = await request.json()
    const { encryptedContent, filename, description, tags } = body

    if (!encryptedContent || typeof encryptedContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Encrypted content is required' },
        { status: 400 }
      )
    }

    // Check if file exists
    const existingFile = await fileService.getEncryptedData(fileId)
    if (!existingFile) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
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
        { success: false, error: result.error || 'Update failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      version: result.version
    })
  } catch (error) {
    console.error('Failed to update file:', error)
    
    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update file' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { fileId } = params

    const deleted = await fileService.deleteFile(fileId)
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete file' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete file:', error)
    
    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}