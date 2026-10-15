'use client'

import { useState, useCallback, useEffect } from 'react'
import { Lock, Unlock, AlertCircle, CheckCircle, Shield, Key, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RichTextEditor from '@/components/ui/RichTextEditor'
import MultiNoteEditor from '@/components/ui/MultiNoteEditor'
import { PassphraseInput } from '@/components/ui/PassphraseInput'
import { useSessionEncryption } from '@/hooks/useSessionEncryption'
import { useFileService } from '@/hooks/useFileService'
import { DecryptedData, EnhancedDecryptedData } from '@/types/data'
import { migrateToMultiNote, createEnhancedData } from '@/utils/multi-note-utils'
import { cn } from '@/lib/utils'

interface SessionEncryptedEditorProps {
  initialContent?: string
  onSave?: (encryptedData: string) => Promise<void>
  autoSaveInterval?: number
  className?: string
  enableFileManager?: boolean
  fileId?: string
  useMultiNoteEditor?: boolean
  enableManualSave?: boolean
}

type EditorMode = 'locked' | 'unlocked' | 'setup'

export default function SessionEncryptedEditor({
  initialContent = '',
  onSave,
  autoSaveInterval = 30000,
  className = '',
  enableFileManager = false,
  fileId,
  useMultiNoteEditor = true,
  enableManualSave = false
}: SessionEncryptedEditorProps) {
  const [mode, setMode] = useState<EditorMode>('setup')
  const [customPassphrase, setCustomPassphrase] = useState('')
  const [useCustomPassphrase, setUseCustomPassphrase] = useState(false)
  const [content, setContent] = useState('')
  const [decryptedData, setDecryptedData] = useState<EnhancedDecryptedData | null>(null)
  const [encryptedData, setEncryptedData] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [customFilename, setCustomFilename] = useState('')
  const [showManualSave, setShowManualSave] = useState(false)

  const {
    hasSessionPassphrase,
    encryptWithSession,
    decryptWithSession,
    encryptWithCustom,
    decryptWithCustom,
    validatePassphrase,
    isContentEncrypted,
    extractRichTextContent,
    state: encryptionState,
    clearError
  } = useSessionEncryption()

  const { saveFile, loadFile } = useFileService()

  // Determine which encryption method to use
  const shouldUseSession = hasSessionPassphrase && !useCustomPassphrase
  
  const encryptContent = useCallback(async (content: string, title?: string) => {
    if (shouldUseSession) {
      return encryptWithSession(content, title)
    } else {
      return encryptWithCustom(content, customPassphrase, title)
    }
  }, [shouldUseSession, encryptWithSession, encryptWithCustom, customPassphrase])

  const decryptContent = useCallback(async (data: string) => {
    if (shouldUseSession) {
      return decryptWithSession(data)
    } else {
      return decryptWithCustom(data, customPassphrase)
    }
  }, [shouldUseSession, decryptWithSession, decryptWithCustom, customPassphrase])

  // Auto-decrypt when encrypted data is loaded and session is available
  useEffect(() => {
    const autoDecrypt = async () => {
      if (mode === 'locked' && encryptedData && hasSessionPassphrase && !useCustomPassphrase) {
        setSaveStatus('saving')
        setStatusMessage('Auto-decrypting with your login key...')
        
        try {
          const result = await decryptWithSession(encryptedData)
          
          if (result.success && result.decryptedData) {
            const enhancedData = createEnhancedData(result.decryptedData)
            setDecryptedData(enhancedData)
            
            if (!useMultiNoteEditor) {
              const textContent = extractRichTextContent(result.decryptedData)
              setContent(textContent)
            }
            
            setMode('unlocked')
            setSaveStatus('idle')
            setStatusMessage('Decrypted with your login key')
          }
        } catch (error) {
          // Auto-decrypt failed, user needs to enter passphrase
          setSaveStatus('idle')
          setStatusMessage('')
        }
      }
    }
    
    autoDecrypt()
  }, [mode, encryptedData, hasSessionPassphrase, useCustomPassphrase, decryptWithSession, extractRichTextContent, useMultiNoteEditor])

  // Load file when fileId changes
  useEffect(() => {
    const loadFileContent = async () => {
      if (fileId && !initialContent) {
        setContent('')
        setEncryptedData('')
        setCustomPassphrase('')
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
              setStatusMessage('')
            } else {
              setContent(fileData.encryptedContent)
              setMode('unlocked')
              setSaveStatus('idle')
              setStatusMessage('File loaded')
            }
          }
        } catch (error) {
          setSaveStatus('error')
          setStatusMessage('Error loading file')
        }
      }
    }

    loadFileContent()
  }, [fileId, loadFile, isContentEncrypted, initialContent, clearError])

  // Initialize with initial content
  useEffect(() => {
    if (initialContent && !fileId) {
      if (isContentEncrypted(initialContent)) {
        setEncryptedData(initialContent)
        setMode('locked')
      } else {
        setContent(initialContent)
        setMode('setup')
      }
    }
  }, [initialContent, fileId, isContentEncrypted])

  // Handle decrypt
  const handleDecrypt = useCallback(async () => {
    if (!encryptedData) return

    setSaveStatus('saving')
    setStatusMessage('Decrypting...')

    const result = await decryptContent(encryptedData)

    if (result.success && result.decryptedData) {
      const enhancedData = createEnhancedData(result.decryptedData)
      setDecryptedData(enhancedData)
      
      if (!useMultiNoteEditor) {
        const textContent = extractRichTextContent(result.decryptedData)
        setContent(textContent)
      }
      
      setMode('unlocked')
      setSaveStatus('idle')
      setStatusMessage('Decrypted successfully')
    } else {
      setSaveStatus('error')
      setStatusMessage(result.error || 'Failed to decrypt')
    }
  }, [encryptedData, decryptContent, extractRichTextContent, useMultiNoteEditor])

  // Handle multi-note save
  const handleMultiNoteSave = useCallback(async (data: EnhancedDecryptedData, filename?: string) => {
    // If manual save is enabled and no filename provided, show the manual save dialog
    if (enableManualSave && !filename) {
      setShowManualSave(true)
      setDecryptedData(data) // Store data for later save
      return
    }

    setSaveStatus('saving')
    setStatusMessage('Encrypting and saving...')

    try {
      const dataString = JSON.stringify(data, null, 2)
      console.log('Encrypting data with session:', shouldUseSession, 'hasSessionPassphrase:', hasSessionPassphrase)
      
      const result = await encryptContent(dataString, filename || 'Emergency Information')
      console.log('Encryption result:', result)
      
      if (result.success && result.encryptedData) {
        setEncryptedData(result.encryptedData)
        
        if (onSave) {
          await onSave(result.encryptedData)
          setSaveStatus('saved')
          setStatusMessage('Saved successfully')
        } else if (enableFileManager) {
          const finalFilename = filename || `emergency-info-${new Date().toISOString().split('T')[0]}`
          const saveResult = await saveFile(result.encryptedData, {
            fileId,
            filename: finalFilename,
            description: 'Emergency information',
            tags: ['emergency', 'encrypted']
          })
          
          if (saveResult.success) {
            setSaveStatus('saved')
            setStatusMessage(`Saved as "${finalFilename}"`)
            setShowManualSave(false)
            setCustomFilename('')
          } else {
            setSaveStatus('error')
            setStatusMessage(saveResult.error || 'Failed to save file')
          }
        }
      } else {
        setSaveStatus('error')
        setStatusMessage(result.error || 'Encryption failed')
      }
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
      setStatusMessage(error instanceof Error ? error.message : 'Save failed')
    }
  }, [encryptContent, onSave, enableFileManager, saveFile, fileId, enableManualSave])

  // Handle manual save with custom filename
  const handleManualSave = useCallback(async () => {
    if (!customFilename.trim() || !decryptedData) return
    
    await handleMultiNoteSave(decryptedData, customFilename.trim())
  }, [customFilename, decryptedData, handleMultiNoteSave])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Encryption Status Banner */}
      {hasSessionPassphrase && !useCustomPassphrase && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Using your login key for encryption
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUseCustomPassphrase(true)}
              className="text-green-600 hover:text-green-800"
            >
              Use different key
            </Button>
          </div>
        </div>
      )}

      {/* Custom Passphrase Option */}
      {(useCustomPassphrase || !hasSessionPassphrase) && mode === 'locked' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {hasSessionPassphrase ? 'Custom encryption key' : 'Encryption key'}
            </label>
            {hasSessionPassphrase && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUseCustomPassphrase(false)
                  setCustomPassphrase('')
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                Use login key
              </Button>
            )}
          </div>
          <PassphraseInput
            value={customPassphrase}
            onChange={setCustomPassphrase}
            placeholder="Enter encryption key"
            disabled={encryptionState.isDecrypting}
            error={encryptionState.lastError || undefined}
          />
          <Button
            onClick={handleDecrypt}
            disabled={!customPassphrase || encryptionState.isDecrypting}
            className="w-full"
          >
            <Unlock className="h-4 w-4 mr-2" />
            Decrypt
          </Button>
        </div>
      )}

      {/* Editor Content */}
      {mode === 'unlocked' && (
        <div className="space-y-4">
          {useMultiNoteEditor && decryptedData ? (
            <MultiNoteEditor
              data={decryptedData}
              onDataChange={setDecryptedData}
              onSave={handleMultiNoteSave}
            />
          ) : (
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Enter your content here..."
            />
          )}
        </div>
      )}

      {/* Setup Mode */}
      {mode === 'setup' && (
        <div className="text-center py-12 space-y-4">
          <Shield className="h-16 w-16 text-gray-400 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900">
            {hasSessionPassphrase 
              ? 'Create encrypted content using your login key'
              : 'Create encrypted content'
            }
          </h3>
          <Button
            onClick={() => {
              const initialData = createEnhancedData({
                metadata: {
                  lastModified: new Date().toISOString(),
                  version: '1.0',
                  dataFormat: 'multi-note'
                }
              })
              setDecryptedData(initialData)
              setMode('unlocked')
            }}
          >
            Start Creating
          </Button>
        </div>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div className={cn(
          'px-4 py-2 rounded-lg text-sm',
          saveStatus === 'saved' && 'bg-green-50 text-green-800',
          saveStatus === 'saving' && 'bg-blue-50 text-blue-800',
          saveStatus === 'error' && 'bg-red-50 text-red-800'
        )}>
          {statusMessage}
        </div>
      )}

      {/* Manual Save Dialog */}
      {showManualSave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Save with Custom Name
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filename
                </label>
                <Input
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder="my-emergency-info"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Give your emergency information a memorable name
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleManualSave}
                  disabled={!customFilename.trim() || saveStatus === 'saving'}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowManualSave(false)
                    setCustomFilename('')
                  }}
                  disabled={saveStatus === 'saving'}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}