'use client'

import { useState, useCallback, useEffect } from 'react'
import { Lock, Unlock, AlertCircle, CheckCircle, Shield, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import RichTextEditor from '@/components/ui/RichTextEditor'
import MultiNoteEditor from '@/components/ui/MultiNoteEditor'
import PasswordVault from '@/components/ui/PasswordVault'
import DocumentRepository from '@/components/ui/DocumentRepository'
import { PassphraseInput } from '@/components/ui/PassphraseInput'
import { useEncryption } from '@/hooks/useEncryption'
import { useFileService } from '@/hooks/useFileService'
import { DecryptedData, EnhancedDecryptedData } from '@/types/data'
import { migrateToMultiNote, createEnhancedData } from '@/utils/multi-note-utils'
import { passwordVaultService } from '@/services/password-vault-service'
import { documentRepositoryService } from '@/services/document-repository-service'
import ContextualHelp from './ContextualHelp'
import HelpTooltip from './HelpTooltip'

interface EncryptedEditorProps {
  initialContent?: string
  onSave?: (encryptedData: string) => Promise<void>
  autoSaveInterval?: number
  className?: string
  enableFileManager?: boolean
  fileId?: string
  useMultiNoteEditor?: boolean  // New prop to enable multi-note editor
  enablePasswordVault?: boolean  // New prop to enable password vault
  enableDocumentRepository?: boolean  // New prop to enable document repository
}

type EditorMode = 'locked' | 'unlocked' | 'setup'

export default function EncryptedEditor({
  initialContent = '',
  onSave,
  autoSaveInterval = 30000,
  className = '',
  enableFileManager = false,
  fileId,
  useMultiNoteEditor = true,  // Default to true for new multi-note functionality
  enablePasswordVault = true,  // Default to true for password vault functionality
  enableDocumentRepository = true  // Default to true for document repository functionality
}: EncryptedEditorProps) {
  const [mode, setMode] = useState<EditorMode>('setup')
  const [passphrase, setPassphrase] = useState('')
  const [content, setContent] = useState('')
  const [decryptedData, setDecryptedData] = useState<EnhancedDecryptedData | null>(null)
  const [encryptedData, setEncryptedData] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor')
  const [activeTab, setActiveTab] = useState<'notes' | 'passwords' | 'documents'>('notes')

  const {
    state: encryptionState,
    encryptContent,
    decryptContent,
    validatePassphrase,
    isContentEncrypted,
    extractRichTextContent,
    clearError
  } = useEncryption()

  const {
    saveFile,
    loadFile
  } = useFileService()

  // Load file when fileId changes
  useEffect(() => {
    const loadFileContent = async () => {
      if (fileId && !initialContent) {
        // Reset state when loading new file
        setContent('')
        setEncryptedData('')
        setPassphrase('')
        clearError()
        
        setSaveStatus('saving')
        setStatusMessage('Loading file...')
        
        try {
          const fileData = await loadFile(fileId)
          if (fileData) {
            if (isContentEncrypted(fileData.encryptedContent)) {
              setEncryptedData(fileData.encryptedContent)
              setMode('locked')
              setSaveStatus('idle')
              setStatusMessage('File loaded - enter passphrase to decrypt')
            } else {
              setContent(fileData.encryptedContent)
              setMode('unlocked')
              setSaveStatus('idle')
              setStatusMessage('File loaded')
            }
          } else {
            setSaveStatus('error')
            setStatusMessage('Failed to load file')
          }
        } catch (error) {
          console.error('Error loading file:', error)
          setSaveStatus('error')
          setStatusMessage('Error loading file')
        }
      } else if (!fileId && !initialContent) {
        // Reset to setup mode when no file is selected
        setContent('')
        setEncryptedData('')
        setPassphrase('')
        setMode('setup')
        setSaveStatus('idle')
        setStatusMessage('')
        clearError()
      }
    }

    loadFileContent()
  }, [fileId, loadFile, isContentEncrypted, initialContent, clearError])

  // Initialize component based on initial content
  useEffect(() => {
    if (initialContent && !fileId) {
      if (isContentEncrypted(initialContent)) {
        setEncryptedData(initialContent)
        setMode('locked')
      } else {
        setContent(initialContent)
        setMode('unlocked')
      }
    }
  }, [initialContent, isContentEncrypted, fileId])

  // Handle encryption
  const handleEncrypt = useCallback(async () => {
    if (!content || !passphrase) return

    const validation = validatePassphrase(passphrase)
    if (!validation.isValid) {
      setStatusMessage(`Invalid passphrase: ${validation.errors.join(', ')}`)
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    setStatusMessage('Encrypting...')

    const result = await encryptContent(content, passphrase, 'Emergency Information')
    
    if (result.success && result.encryptedData) {
      setEncryptedData(result.encryptedData)
      setMode('locked')
      setSaveStatus('saved')
      setStatusMessage('Content encrypted successfully')
      
      // Save encrypted data
      if (onSave) {
        try {
          await onSave(result.encryptedData)
        } catch (error) {
          console.error('Save failed:', error)
          setSaveStatus('error')
          setStatusMessage('Encryption succeeded but save failed')
        }
      } else if (enableFileManager) {
        // Use file service to save
        try {
          const saveResult = await saveFile(result.encryptedData, {
            fileId,
            filename: `emergency-info-${new Date().toISOString().split('T')[0]}`,
            description: 'Emergency information',
            tags: ['emergency', 'encrypted']
          })
          
          if (!saveResult.success) {
            setSaveStatus('error')
            setStatusMessage(saveResult.error || 'File save failed')
          }
        } catch (error) {
          console.error('File save failed:', error)
          setSaveStatus('error')
          setStatusMessage('File save failed')
        }
      }
    } else {
      setSaveStatus('error')
      setStatusMessage(result.error || 'Encryption failed')
    }

    // Clear status after delay
    setTimeout(() => {
      setSaveStatus('idle')
      setStatusMessage('')
    }, 3000)
  }, [content, passphrase, validatePassphrase, encryptContent, onSave, enableFileManager, fileId, saveFile])

  // Handle decryption
  const handleDecrypt = useCallback(async () => {
    if (!encryptedData || !passphrase) return

    setSaveStatus('saving')
    setStatusMessage('Decrypting...')

    const result = await decryptContent(encryptedData, passphrase)
    
    if (result.success && result.decryptedData) {
      try {
        // Try to parse as structured data
        const parsedData: DecryptedData = typeof result.decryptedData === 'string' 
          ? JSON.parse(result.decryptedData) 
          : result.decryptedData

        // Clean up corrupted data first
        let cleanedData = parsedData
        
        // Check for nested multi-note data corruption
        if (cleanedData.sections && cleanedData.sections.length > 0) {
          for (const section of cleanedData.sections) {
            const content = Array.isArray(section.content) ? section.content[0] : section.content
            if (typeof content === 'string' && content.trim().startsWith('{')) {
              try {
                const nestedData = JSON.parse(content)
                if (nestedData.metadata?.dataFormat === 'multi-note' && nestedData.notes) {
                  console.warn('Detected corrupted nested data, replacing with cleaned version')
                  cleanedData = nestedData
                  break
                }
              } catch (error) {
                console.warn('Failed to parse potential nested data:', error)
              }
            }
          }
        }

        // Migrate and enhance data if needed
        if (!cleanedData.metadata?.dataFormat || cleanedData.metadata.dataFormat !== 'multi-note') {
          const migrationResult = migrateToMultiNote(cleanedData)
          console.log('Migration during decrypt:', migrationResult)
        }

        const enhancedData = createEnhancedData(cleanedData)
        setDecryptedData(enhancedData)

        // For backward compatibility with single-content editor
        if (!useMultiNoteEditor) {
          const richTextContent = extractRichTextContent(cleanedData)
          setContent(richTextContent)
        } else {
          // Even in multi-note mode, we need to set the content for initial display
          const richTextContent = extractRichTextContent(cleanedData)
          setContent(richTextContent)
        }

        setMode('unlocked')
        setSaveStatus('saved')
        setStatusMessage('Content decrypted successfully')
      } catch (parseError) {
        // Fallback for non-structured data
        console.warn('Failed to parse as structured data, treating as plain content:', parseError)
        
        const richTextContent = extractRichTextContent(result.decryptedData)
        
        if (useMultiNoteEditor) {
          // Create a basic enhanced data structure with the content as a single note
          const basicData: EnhancedDecryptedData = createEnhancedData({
            metadata: {
              lastModified: new Date().toISOString(),
              version: '1.0',
              dataFormat: 'multi-note'
            }
          })
          
          // Add the content as the first note
          basicData.notes = [{
            id: 'imported-note',
            title: 'Imported Content',
            content: richTextContent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: { wordCount: 0, characterCount: 0 }
          }]
          basicData.metadata.activeNoteId = 'imported-note'
          
          // Initialize password vault if enabled
          if (enablePasswordVault) {
            basicData.passwordVault = passwordVaultService.createEmptyVault()
          }
          
          // Initialize document repository if enabled
          if (enableDocumentRepository) {
            basicData.documentRepository = documentRepositoryService.createEmptyRepository()
          }
          
          setDecryptedData(basicData)
        } else {
          setContent(richTextContent)
        }

        setMode('unlocked')
        setSaveStatus('saved')
        setStatusMessage('Content decrypted successfully')
      }
    } else {
      setSaveStatus('error')
      setStatusMessage(result.error || 'Decryption failed - check your passphrase')
    }

    // Clear status after delay
    setTimeout(() => {
      setSaveStatus('idle')
      setStatusMessage('')
    }, 3000)
  }, [encryptedData, passphrase, decryptContent, extractRichTextContent, useMultiNoteEditor])

  // Handle auto-save (encrypt and save)
  const handleAutoSave = useCallback(async (content: string) => {
    if (mode === 'unlocked' && passphrase && onSave) {
      const result = await encryptContent(content, passphrase, 'Emergency Information')
      if (result.success && result.encryptedData) {
        setEncryptedData(result.encryptedData)
        await onSave(result.encryptedData)
      }
    }
  }, [mode, passphrase, encryptContent, onSave])

  // Handle multi-note data changes
  const handleMultiNoteDataChange = useCallback((newData: EnhancedDecryptedData) => {
    setDecryptedData(newData)
  }, [])

  // Handle multi-note save
  const handleMultiNoteSave = useCallback(async (data: EnhancedDecryptedData) => {
    if (!passphrase) return

    setSaveStatus('saving')
    setStatusMessage('Encrypting and saving...')

    try {
      // Convert structured data to JSON string for encryption
      const dataString = JSON.stringify(data, null, 2)
      const result = await encryptContent(dataString, passphrase, 'Emergency Information - Multi-Note')
      
      if (result.success && result.encryptedData) {
        setEncryptedData(result.encryptedData)
        
        if (onSave) {
          await onSave(result.encryptedData)
          setSaveStatus('saved')
          setStatusMessage('Data saved successfully')
        } else if (enableFileManager) {
          const saveResult = await saveFile(result.encryptedData, {
            fileId,
            filename: `emergency-info-${new Date().toISOString().split('T')[0]}`,
            description: 'Emergency information (Multi-Note)',
            tags: ['emergency', 'encrypted', 'multi-note']
          })
          
          if (saveResult.success) {
            setSaveStatus('saved')
            setStatusMessage('Data saved successfully')
          } else {
            setSaveStatus('error')
            setStatusMessage(saveResult.error || 'Save failed')
          }
        }
      } else {
        setSaveStatus('error')
        setStatusMessage(result.error || 'Encryption failed')
      }
    } catch (error) {
      console.error('Multi-note save failed:', error)
      setSaveStatus('error')
      setStatusMessage('Save operation failed')
    }

    // Clear status after delay
    setTimeout(() => {
      setSaveStatus('idle')
      setStatusMessage('')
    }, 3000)
  }, [passphrase, encryptContent, onSave, enableFileManager, fileId, saveFile])

  // Lock the editor (encrypt current content)
  const handleLock = useCallback(async () => {
    if (mode === 'unlocked' && content && passphrase) {
      await handleEncrypt()
    }
  }, [mode, content, passphrase, handleEncrypt])

  const renderStatusIndicator = () => {
    if (saveStatus === 'idle' && !statusMessage) return null

    const getIcon = () => {
      switch (saveStatus) {
        case 'saving':
          return <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        case 'saved':
          return <CheckCircle className="h-4 w-4 text-green-600" />
        case 'error':
          return <AlertCircle className="h-4 w-4 text-red-600" />
        default:
          return null
      }
    }

    const getTextColor = () => {
      switch (saveStatus) {
        case 'saving': return 'text-blue-600'
        case 'saved': return 'text-green-600'
        case 'error': return 'text-red-600'
        default: return 'text-gray-600'
      }
    }

    return (
      <div className={`flex items-center space-x-2 ${getTextColor()}`}>
        {getIcon()}
        <span className="text-sm">{statusMessage}</span>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with status and mode indicator */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {mode === 'locked' ? (
              <Lock className="h-5 w-5 text-red-600" />
            ) : (
              <Unlock className="h-5 w-5 text-green-600" />
            )}
            <span className="font-medium">
              {mode === 'locked' ? 'Content Encrypted' : mode === 'unlocked' ? 'Content Unlocked' : 'Setup Encryption'}
            </span>
          </div>
          <Shield className="h-4 w-4 text-blue-600" />
        </div>
        {renderStatusIndicator()}
      </div>

      {/* Passphrase Input */}
      <div className="space-y-4">
        <PassphraseInput
          value={passphrase}
          onChange={setPassphrase}
          placeholder={mode === 'locked' ? 'Enter passphrase to decrypt' : 'Create a strong passphrase'}
          showStrengthIndicator={mode !== 'locked'}
          showGenerateButton={mode !== 'locked'}
          disabled={encryptionState.isEncrypting || encryptionState.isDecrypting}
          error={encryptionState.lastError || undefined}
        />

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {mode === 'locked' && (
            <Button
              onClick={handleDecrypt}
              disabled={!passphrase || encryptionState.isDecrypting}
              className="flex items-center space-x-2"
            >
              <Unlock className="h-4 w-4" />
              <span>Decrypt</span>
            </Button>
          )}
          
          {mode === 'unlocked' && (
            <Button
              onClick={handleLock}
              variant="outline"
              disabled={!content || !passphrase || encryptionState.isEncrypting}
              className="flex items-center space-x-2"
            >
              <Lock className="h-4 w-4" />
              <span>Lock</span>
            </Button>
          )}

          {mode === 'setup' && (
            <Button
              onClick={useMultiNoteEditor ? () => {
                // Create initial empty data structure for setup
                if (!decryptedData) {
                  const initialData = createEnhancedData({
                    metadata: {
                      lastModified: new Date().toISOString(),
                      version: '1.0',
                      dataFormat: 'multi-note'
                    }
                  })
                  // Add an initial empty note
                  initialData.notes = [{
                    id: 'initial-note',
                    title: 'Welcome Note',
                    content: '<p>Start writing your emergency information here...</p>',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    metadata: { wordCount: 0, characterCount: 0 }
                  }]
                  initialData.metadata.activeNoteId = 'initial-note'
                  
                  // Initialize password vault if enabled
                  if (enablePasswordVault) {
                    initialData.passwordVault = passwordVaultService.createEmptyVault()
                  }
                  
                  // Initialize document repository if enabled
                  if (enableDocumentRepository) {
                    initialData.documentRepository = documentRepositoryService.createEmptyRepository()
                  }
                  setDecryptedData(initialData)
                  setMode('unlocked')
                }
              } : handleEncrypt}
              disabled={(!content && !useMultiNoteEditor) || !passphrase || encryptionState.isEncrypting}
              className="flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>{useMultiNoteEditor ? 'Setup Multi-Note Editor' : 'Encrypt & Save'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation - Only shown when unlocked or in setup */}
      {(mode === 'unlocked' || mode === 'setup') && (
        <div className="space-y-4">
          {/* Tab Headers */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📝 Notes & Documents
              </button>
              {enablePasswordVault && (
                <button
                  onClick={() => setActiveTab('passwords')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'passwords'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🔑 Password Vault
                </button>
              )}
              {enableDocumentRepository && (
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'documents'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📁 Documents
                </button>
              )}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'notes' ? (
            useMultiNoteEditor && decryptedData ? (
              <MultiNoteEditor
                data={decryptedData}
                onDataChange={handleMultiNoteDataChange}
                onSave={handleMultiNoteSave}
                autoSaveInterval={autoSaveInterval}
                isLoading={encryptionState.isEncrypting || encryptionState.isDecrypting}
              />
            ) : (
              <div className="space-y-4">
                {/* View Mode Toggle */}
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setViewMode('editor')}
                      className={`px-3 py-1 text-sm rounded ${viewMode === 'editor' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                      Editor
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`px-3 py-1 text-sm rounded ${viewMode === 'preview' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                      Preview
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    {viewMode === 'editor' ? 'Edit Mode' : 'Markdown Preview'}
                  </div>
                </div>
                
                {/* Content Display */}
                {viewMode === 'editor' ? (
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    onSave={handleAutoSave}
                    placeholder="Enter your emergency information here..."
                    autoSaveInterval={autoSaveInterval}
                    minLength={10}
                    maxLength={10000}
                  />
                ) : (
                  <div className="border border-gray-300 rounded-lg">
                    {content ? (
                      <div className="p-4">
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: content }}
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <p>No content to preview. Switch to Editor mode to add content.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          ) : activeTab === 'passwords' ? (
            /* Password Vault Tab */
            enablePasswordVault && decryptedData && (
              <PasswordVault
                vault={decryptedData.passwordVault || passwordVaultService.createEmptyVault()}
                onVaultChange={(updatedVault) => {
                  const updatedData = {
                    ...decryptedData,
                    passwordVault: updatedVault
                  }
                  setDecryptedData(updatedData)
                  handleMultiNoteSave(updatedData)
                }}
              />
            )
          ) : (
            /* Document Repository Tab */
            enableDocumentRepository && decryptedData && (
              <DocumentRepository
                repository={decryptedData.documentRepository || documentRepositoryService.createEmptyRepository()}
                onRepositoryChange={(updatedRepository) => {
                  const updatedData = {
                    ...decryptedData,
                    documentRepository: updatedRepository
                  }
                  setDecryptedData(updatedData)
                  handleMultiNoteSave(updatedData)
                }}
              />
            )
          )}
        </div>
      )}

      {/* Locked State Message */}
      {mode === 'locked' && (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Content is Encrypted</h3>
          <p className="text-gray-600">
            Enter your passphrase above to decrypt and view your emergency information.
          </p>
        </div>
      )}

      {/* Error Display */}
      {encryptionState.lastError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-700">{encryptionState.lastError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}