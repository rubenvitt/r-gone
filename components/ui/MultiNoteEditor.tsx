'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Save, FolderOpen, History, ChevronDown, ChevronRight, Search, Tag, GitCompare, Lock, Unlock, Shield, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import RichTextEditor from '@/components/ui/RichTextEditor'
import VersionHistoryPanel from '@/components/ui/VersionHistoryPanel'
import VersionDiffViewer from '@/components/ui/VersionDiffViewer'
import NotePasswordManager from '@/components/ui/NotePasswordManager'
import AutoSaveIndicator from '@/components/ui/AutoSaveIndicator'
import RecoveryManager from '@/components/ui/RecoveryManager'
import StatusBar from '@/components/ui/StatusBar'
import MobileToolbar from '@/components/ui/MobileToolbar'
import { 
    DecryptedData, 
    EnhancedDecryptedData,
    NoteVersion
} from '@/types/data'
import {
    createNote,
    upsertNote,
    removeNote,
    findNoteById,
    createNoteVersion,
    addVersionToHistory,
    getNoteVersionHistory,
    restoreNoteToVersion,
    migrateToMultiNote,
    createEnhancedData,
    validateDataStructure
} from '@/utils/multi-note-utils'
import { Note } from '@/types/data'
import { autoSaveManager, AutoSaveConfig } from '@/utils/auto-save-manager'
import { errorRecoveryManager, RecoverySnapshot } from '@/utils/error-recovery'

interface MultiNoteEditorProps {
    data: DecryptedData
    onDataChange: (data: EnhancedDecryptedData) => void
    onSave?: (data: EnhancedDecryptedData) => Promise<void>
    isLoading?: boolean
}

type ViewMode = 'notes' | 'versions' | 'diff' | 'password' | 'recovery'

export default function MultiNoteEditor({
    data: initialData,
    onDataChange,
    onSave,
    isLoading = false
}: MultiNoteEditorProps) {
    // Migrate and enhance data on first load
    const [data, setData] = useState<EnhancedDecryptedData>(() => {
        const migratedData = { ...initialData }
        
        // Migrate legacy data if needed
        if (migratedData.metadata.dataFormat !== 'multi-note') {
            const migrationResult = migrateToMultiNote(migratedData)
            console.log('Migration result:', migrationResult)
        }
        
        return createEnhancedData(migratedData)
    })

    const [activeNoteId, setActiveNoteId] = useState<string>(() => {
        const stored = data.metadata.activeNoteId
        if (stored && data.notes?.find(n => n.id === stored)) {
            return stored
        }
        return data.notes?.[0]?.id || ''
    })

    const [viewMode, setViewMode] = useState<ViewMode>('notes')
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingNoteTitle, setEditingNoteTitle] = useState<string | null>(null)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [selectedVersionForDiff, setSelectedVersionForDiff] = useState<{old: NoteVersion, new: NoteVersion} | null>(null)
    const [unlockedNotes, setUnlockedNotes] = useState<Set<string>>(new Set())
    const [autoSaveConfig, setAutoSaveConfig] = useState<AutoSaveConfig>(autoSaveManager.getConfig())
    const [hasRecoveryData, setHasRecoveryData] = useState(false)
    
    const lastSavedContent = useRef<string>('')
    const currentNote = findNoteById(data, activeNoteId)

    // Update data when it changes
    const updateData = useCallback((newData: EnhancedDecryptedData) => {
        setData(newData)
        onDataChange(newData)
    }, [onDataChange])

    // Create new note
    const handleCreateNote = useCallback(() => {
        const newNote = createNote({
            title: `New Note ${(data.notes?.length || 0) + 1}`
        })
        
        const updatedData = { ...data }
        upsertNote(updatedData, newNote)
        
        // Add version history entry
        const version = createNoteVersion(newNote, 'create', 'Note created')
        addVersionToHistory(updatedData, version)
        
        setActiveNoteId(newNote.id)
        updateData(updatedData)
    }, [data, updateData])

    // Delete note
    const handleDeleteNote = useCallback((noteId: string) => {
        if (!data.notes || data.notes.length <= 1) {
            alert('Cannot delete the last note')
            return
        }

        if (confirm('Are you sure you want to delete this note?')) {
            const noteToDelete = findNoteById(data, noteId)
            if (noteToDelete) {
                // Add deletion to version history
                const version = createNoteVersion(noteToDelete, 'delete', 'Note deleted')
                const updatedData = { ...data }
                addVersionToHistory(updatedData, version)
                
                // Remove note
                removeNote(updatedData, noteId)
                
                // Switch to another note if current was deleted
                if (activeNoteId === noteId) {
                    const remainingNote = updatedData.notes?.[0]
                    setActiveNoteId(remainingNote?.id || '')
                }
                
                updateData(updatedData)
            }
        }
    }, [data, activeNoteId, updateData])

    // Update note content
    const handleContentChange = useCallback((content: string) => {
        if (!currentNote) return

        try {
            const updatedNote = {
                ...currentNote,
                content,
                updatedAt: new Date().toISOString()
            }

            const updatedData = { ...data }
            upsertNote(updatedData, updatedNote)
            updateData(updatedData)

            // Create recovery snapshot on content change
            errorRecoveryManager.createSnapshot(
                currentNote.id,
                content,
                currentNote.title,
                'auto'
            )
        } catch (error) {
            console.error('Content update failed:', error)
            errorRecoveryManager.logError(
                'unknown',
                'Failed to update note content',
                error instanceof Error ? error : undefined,
                currentNote.id,
                { operation: 'content_change' }
            )
        }
    }, [currentNote, data, updateData])

    // Update note title
    const handleTitleChange = useCallback((noteId: string, newTitle: string) => {
        const note = findNoteById(data, noteId)
        if (!note) return

        const updatedNote = {
            ...note,
            title: newTitle.trim() || 'Untitled',
            updatedAt: new Date().toISOString()
        }

        const updatedData = { ...data }
        upsertNote(updatedData, updatedNote)
        
        // Add version history entry for title change
        const version = createNoteVersion(updatedNote, 'title_change', `Title changed to "${newTitle}"`)
        addVersionToHistory(updatedData, version)
        
        setEditingNoteTitle(null)
        updateData(updatedData)
    }, [data, updateData])

    // Save data
    const handleSave = useCallback(async () => {
        if (!onSave) return

        setSaveStatus('saving')
        try {
            // Create manual snapshot before save
            if (currentNote) {
                errorRecoveryManager.createSnapshot(
                    currentNote.id,
                    currentNote.content,
                    currentNote.title,
                    'manual',
                    'Manual save triggered'
                )
            }

            await onSave(data)
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 2000)
        } catch (error) {
            console.error('Save failed:', error)
            setSaveStatus('error')
            
            // Log save failure error
            errorRecoveryManager.logError(
                'save_failure',
                'Failed to save data',
                error instanceof Error ? error : undefined,
                currentNote?.id,
                { 
                    operation: 'manual_save',
                    dataSize: JSON.stringify(data).length,
                    noteCount: data.notes?.length || 0
                }
            )
            
            setTimeout(() => setSaveStatus('idle'), 3000)
        }
    }, [onSave, data, currentNote])

    // Enhanced auto-save with new system
    useEffect(() => {
        if (!currentNote || !onSave) return

        const currentContent = currentNote.content
        if (currentContent === lastSavedContent.current) return

        // Use the new auto-save manager
        const saveFunction = async (content: string) => {
            // Update the note content
            const updatedNote = { ...currentNote, content, updatedAt: new Date().toISOString() }
            const updatedData = { ...data }
            upsertNote(updatedData, updatedNote)
            
            // Save via the provided onSave function
            await handleSave()
            
            lastSavedContent.current = content
        }

        autoSaveManager.scheduleSave(
            currentNote.id,
            currentContent,
            saveFunction,
            data
        )

    }, [currentNote?.content, onSave, handleSave, currentNote, data])

    // Filter notes based on search term
    const filteredNotes = data.notes?.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || []

    // Get version history for current note
    const currentNoteVersions = currentNote ? getNoteVersionHistory(data, currentNote.id) : []

    // Handle version restoration
    const handleRestoreVersion = useCallback((versionId: string) => {
        if (!currentNote) return

        const result = restoreNoteToVersion(data, currentNote.id, versionId)
        if (result.success && result.note) {
            updateData(data)
            setViewMode('notes')
            setSelectedVersionForDiff(null)
        } else {
            alert(result.error || 'Failed to restore version')
        }
    }, [currentNote, data, updateData])

    // Handle version preview
    const handlePreviewVersion = useCallback((version: NoteVersion) => {
        if (currentNote) {
            // Find the current version to compare against
            const currentVersion = createNoteVersion(currentNote, 'edit', 'Current version')
            setSelectedVersionForDiff({ old: version, new: currentVersion })
            setViewMode('diff')
        }
    }, [currentNote])

    // Handle closing diff view
    const handleCloseDiff = useCallback(() => {
        setViewMode('versions')
        setSelectedVersionForDiff(null)
    }, [])

    // Handle password management
    const handleShowPasswordManager = useCallback(() => {
        setViewMode('password')
    }, [])

    const handleClosePasswordManager = useCallback(() => {
        setViewMode('notes')
    }, [])

    const handleNotePasswordUpdate = useCallback((updatedNote: Note) => {
        const updatedData = { ...data }
        upsertNote(updatedData, updatedNote)
        
        // Track unlocked status
        if (updatedNote.passwordProtected === false || !updatedNote.passwordProtected) {
            setUnlockedNotes(prev => new Set([...prev, updatedNote.id]))
        } else {
            setUnlockedNotes(prev => {
                const newSet = new Set(prev)
                newSet.delete(updatedNote.id)
                return newSet
            })
        }
        
        updateData(updatedData)
        
        // Add version history entry
        const version = createNoteVersion(updatedNote, 'edit', 'Password settings changed')
        addVersionToHistory(updatedData, version)
        updateData(updatedData)
    }, [data, updateData])

    // Check if current note is accessible (not password protected or unlocked)
    const isNoteAccessible = useCallback((note: Note) => {
        if (!note?.passwordProtected) return true
        return unlockedNotes.has(note.id)
    }, [unlockedNotes])

    // Handle note selection with password check
    const handleNoteSelect = useCallback((noteId: string) => {
        const note = findNoteById(data, noteId)
        if (!note) return

        if (note.passwordProtected && !unlockedNotes.has(noteId)) {
            // Note is locked, show password manager
            setActiveNoteId(noteId)
            handleShowPasswordManager()
        } else {
            // Note is accessible
            setActiveNoteId(noteId)
        }
    }, [data, unlockedNotes, handleShowPasswordManager])

    // Handle auto-save configuration changes
    const handleAutoSaveConfigChange = useCallback((updates: Partial<AutoSaveConfig>) => {
        setAutoSaveConfig(prev => ({ ...prev, ...updates }))
        autoSaveManager.updateConfig(updates)
    }, [])

    // Check for recovery data on mount and active note change
    useEffect(() => {
        if (activeNoteId) {
            const snapshots = errorRecoveryManager.getRecoverySnapshots(activeNoteId)
            const sessions = errorRecoveryManager.getRecoverySessions()
            const unresolvedSessions = sessions.filter(s => !s.resolved)
            
            setHasRecoveryData(snapshots.length > 0 || unresolvedSessions.length > 0)
        }
    }, [activeNoteId])

    // Handle recovery restore
    const handleRecoveryRestore = useCallback((snapshot: RecoverySnapshot) => {
        if (!snapshot) return

        try {
            // Find the note to restore
            const noteToRestore = findNoteById(data, snapshot.noteId)
            if (!noteToRestore) {
                console.error('Note not found for recovery:', snapshot.noteId)
                return
            }

            // Update note with recovered content
            const updatedNote = {
                ...noteToRestore,
                content: snapshot.content,
                title: snapshot.noteTitle || noteToRestore.title,
                updatedAt: new Date().toISOString()
            }

            const updatedData = { ...data }
            upsertNote(updatedData, updatedNote)

            // Add version history entry for recovery
            const version = createNoteVersion(updatedNote, 'edit', `Restored from recovery snapshot (${snapshot.type})`)
            addVersionToHistory(updatedData, version)

            // Switch to the restored note
            setActiveNoteId(snapshot.noteId)
            updateData(updatedData)

            // Clear recovery data for this note
            errorRecoveryManager.clearRecoveryData(snapshot.noteId)
            setHasRecoveryData(false)

            alert('Content restored successfully!')
        } catch (error) {
            console.error('Recovery restore failed:', error)
            errorRecoveryManager.logError(
                'unknown',
                'Failed to restore from recovery snapshot',
                error instanceof Error ? error : undefined,
                snapshot.noteId,
                { operation: 'recovery_restore', snapshotId: snapshot.id }
            )
            alert('Failed to restore content. Please try again.')
        }
    }, [data, updateData])

    // Validate data structure
    const validation = validateDataStructure(data)
    if (!validation.isValid) {
        console.warn('Data structure validation failed:', validation.errors)
    }

    return (
        <div className="flex h-full bg-white border border-gray-300 rounded-lg overflow-hidden">
            {/* Sidebar */}
            <div className={`${
                sidebarCollapsed 
                    ? 'w-12' 
                    : 'w-80 md:w-80 sm:w-72 xs:w-64'
            } border-r border-gray-200 flex flex-col transition-all duration-200 relative`}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        {!sidebarCollapsed && (
                            <div className="flex space-x-1">
                                <Button
                                    variant={viewMode === 'notes' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('notes')}
                                >
                                    <FolderOpen className="h-4 w-4 mr-1" />
                                    Notes
                                </Button>
                                <Button
                                    variant={viewMode === 'versions' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('versions')}
                                    disabled={!currentNote || currentNoteVersions.length === 0}
                                >
                                    <History className="h-4 w-4 mr-1" />
                                    History
                                </Button>
                                {viewMode === 'versions' && currentNoteVersions.length >= 2 && (
                                    <Button
                                        variant={viewMode === 'diff' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => {
                                            if (currentNoteVersions.length >= 2) {
                                                const latest = currentNoteVersions[0]
                                                const previous = currentNoteVersions[1]
                                                setSelectedVersionForDiff({ old: previous, new: latest })
                                                setViewMode('diff')
                                            }
                                        }}
                                        disabled={!currentNote || currentNoteVersions.length < 2}
                                    >
                                        <GitCompare className="h-4 w-4 mr-1" />
                                        Compare
                                    </Button>
                                )}
                                {hasRecoveryData && (
                                    <Button
                                        variant={viewMode === 'recovery' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setViewMode('recovery')}
                                        className="text-orange-600 hover:text-orange-700"
                                    >
                                        <AlertTriangle className="h-4 w-4 mr-1" />
                                        Recovery
                                    </Button>
                                )}
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        >
                            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {!sidebarCollapsed && (
                    <>
                        {/* Search */}
                        {viewMode === 'notes' && (
                            <div className="p-4 border-b border-gray-200">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search notes..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {viewMode === 'notes' ? (
                                <>
                                    {/* New Note Button */}
                                    <div className="p-4 border-b border-gray-200">
                                        <Button
                                            onClick={handleCreateNote}
                                            className="w-full"
                                            size="sm"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            New Note
                                        </Button>
                                    </div>

                                    {/* Notes List */}
                                    <div className="divide-y divide-gray-200">
                                        {filteredNotes.map((note) => (
                                            <div
                                                key={note.id}
                                                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                                                    activeNoteId === note.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                                                } ${note.passwordProtected && !unlockedNotes.has(note.id) ? 'opacity-75' : ''}`}
                                                onClick={() => handleNoteSelect(note.id)}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        {editingNoteTitle === note.id ? (
                                                            <input
                                                                type="text"
                                                                defaultValue={note.title}
                                                                className="w-full text-sm font-medium border border-gray-300 rounded px-2 py-1"
                                                                onBlur={(e) => handleTitleChange(note.id, e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleTitleChange(note.id, e.currentTarget.value)
                                                                    } else if (e.key === 'Escape') {
                                                                        setEditingNoteTitle(null)
                                                                    }
                                                                }}
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <div className="flex items-center space-x-2">
                                                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                                                    {note.title}
                                                                </h3>
                                                                {note.passwordProtected && (
                                                                    unlockedNotes.has(note.id) ? (
                                                                        <Unlock className="h-3 w-3 text-green-600" title="Unlocked" />
                                                                    ) : (
                                                                        <Lock className="h-3 w-3 text-red-600" title="Password Protected" />
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {note.metadata?.wordCount || 0} words • {' '}
                                                            {new Date(note.updatedAt).toLocaleDateString()}
                                                        </p>
                                                        {note.tags && note.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {note.tags.map((tag, index) => (
                                                                    <span
                                                                        key={index}
                                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                                                                    >
                                                                        <Tag className="h-3 w-3 mr-1" />
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex space-x-1 ml-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setEditingNoteTitle(note.id)
                                                            }}
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setActiveNoteId(note.id)
                                                                handleShowPasswordManager()
                                                            }}
                                                            title={note.passwordProtected ? "Manage password" : "Add password protection"}
                                                        >
                                                            <Shield className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteNote(note.id)
                                                            }}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : viewMode === 'versions' ? (
                                // Version History View
                                currentNote ? (
                                    <VersionHistoryPanel
                                        versions={currentNoteVersions}
                                        currentNote={currentNote}
                                        onRestoreVersion={handleRestoreVersion}
                                        onPreviewVersion={handlePreviewVersion}
                                        isLoading={saveStatus === 'saving'}
                                    />
                                ) : (
                                    <div className="p-4 text-center text-gray-500">
                                        <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>Select a note to view its version history</p>
                                    </div>
                                )
                            ) : viewMode === 'password' ? (
                                // Password Management View
                                currentNote ? (
                                    <NotePasswordManager
                                        note={currentNote}
                                        onNoteUpdate={handleNotePasswordUpdate}
                                        onClose={handleClosePasswordManager}
                                        className="h-full"
                                    />
                                ) : (
                                    <div className="p-4 text-center text-gray-500">
                                        <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p>Select a note to manage password protection</p>
                                    </div>
                                )
                            ) : viewMode === 'recovery' ? (
                                // Recovery Manager View
                                <RecoveryManager
                                    onRestore={handleRecoveryRestore}
                                    onClose={() => setViewMode('notes')}
                                    className="h-full"
                                />
                            ) : (
                                // Diff View
                                selectedVersionForDiff && (
                                    <VersionDiffViewer
                                        oldVersion={selectedVersionForDiff.old}
                                        newVersion={selectedVersionForDiff.new}
                                        onClose={handleCloseDiff}
                                        onRestoreVersion={handleRestoreVersion}
                                    />
                                )
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col">
                {/* Editor Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div>
                            {currentNote ? (
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {currentNote.title}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {currentNote.metadata?.wordCount || 0} words • 
                                        Last updated: {new Date(currentNote.updatedAt).toLocaleString()}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        No Note Selected
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        Create a new note to get started
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        {onSave && (
                            <div className="flex items-center space-x-4">
                                {/* Enhanced Auto-Save Indicator */}
                                <AutoSaveIndicator
                                    showDetails={true}
                                    onConfigChange={handleAutoSaveConfigChange}
                                    className="relative"
                                />
                                
                                {/* Manual Save Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={saveStatus === 'saving' || isLoading}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Now
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 p-4">
                    {currentNote ? (
                        isNoteAccessible(currentNote) ? (
                            <RichTextEditor
                                key={currentNote.id} // Force re-render when note changes
                                content={currentNote.content}
                                onChange={handleContentChange}
                                onSave={undefined} // Disable RichTextEditor's auto-save, use our enhanced system
                                placeholder="Start writing your note..."
                                autoSaveInterval={autoSaveConfig.intervalMs}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                <div className="text-center">
                                    <Lock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg font-medium">Note is Password Protected</p>
                                    <p className="text-sm mb-4">Enter the password to view and edit this note</p>
                                    <Button
                                        onClick={handleShowPasswordManager}
                                        className="flex items-center space-x-2"
                                    >
                                        <Unlock className="h-4 w-4" />
                                        <span>Unlock Note</span>
                                    </Button>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg font-medium">No note selected</p>
                                <p className="text-sm">Choose a note from the sidebar or create a new one</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Status Bar */}
            <StatusBar
                currentNoteId={activeNoteId}
                currentNoteTitle={currentNote?.title}
                isPasswordProtected={currentNote?.passwordProtected}
                isNoteUnlocked={currentNote ? isNoteAccessible(currentNote) : false}
                hasVersionHistory={currentNoteVersions.length > 0}
                onShowRecovery={() => setViewMode('recovery')}
                onShowVersionHistory={() => setViewMode('versions')}
                onShowPasswordManager={() => setViewMode('password')}
            />

            {/* Mobile Toolbar */}
            <MobileToolbar
                onCreateNote={handleCreateNote}
                onSave={handleSave}
                onShowHistory={() => setViewMode('versions')}
                onShowSecurity={() => setViewMode('password')}
                onShowRecovery={() => setViewMode('recovery')}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                hasRecoveryData={hasRecoveryData}
                isSaving={saveStatus === 'saving'}
            />
        </div>
    )
}