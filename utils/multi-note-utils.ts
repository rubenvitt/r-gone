import { v4 as uuidv4 } from 'uuid';
import { 
    DecryptedData, 
    EnhancedDecryptedData, 
    Note, 
    Section, 
    NoteVersion, 
    VersionHistory 
} from '@/types/data';

/**
 * Utility functions for multi-note data management and migrations
 */

export interface CreateNoteOptions {
    title?: string;
    content?: string;
    tags?: string[];
}

export interface MigrationResult {
    success: boolean;
    migratedNotesCount: number;
    warnings: string[];
    errors: string[];
}

/**
 * Create a new note with default values
 */
export function createNote(options: CreateNoteOptions = {}): Note {
    const now = new Date().toISOString();
    
    return {
        id: uuidv4(),
        title: options.title || `New Note ${new Date().toLocaleDateString()}`,
        content: options.content || '',
        createdAt: now,
        updatedAt: now,
        tags: options.tags || [],
        metadata: {
            wordCount: 0,
            characterCount: 0,
            lastEditDuration: 0
        }
    };
}

/**
 * Update note metadata based on content
 */
export function updateNoteMetadata(note: Note): Note {
    const textContent = stripHtmlTags(note.content);
    const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
    const characterCount = textContent.length;
    
    return {
        ...note,
        updatedAt: new Date().toISOString(),
        metadata: {
            ...note.metadata,
            wordCount,
            characterCount
        }
    };
}

/**
 * Strip HTML tags from content to get plain text
 */
function stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
}

/**
 * Migrate legacy sections to new multi-note format
 */
export function migrateToMultiNote(data: DecryptedData): MigrationResult {
    const result: MigrationResult = {
        success: false,
        migratedNotesCount: 0,
        warnings: [],
        errors: []
    };

    try {
        // If already in multi-note format, no migration needed
        if (data.metadata.dataFormat === 'multi-note') {
            result.warnings.push('Data is already in multi-note format');
            result.success = true;
            return result;
        }

        // If no sections exist, create an empty multi-note structure
        if (!data.sections || data.sections.length === 0) {
            data.notes = [];
            data.metadata.dataFormat = 'multi-note';
            result.success = true;
            return result;
        }

        // Convert sections to notes
        const migratedNotes: Note[] = data.sections.map(section => {
            let contentHtml = Array.isArray(section.content) 
                ? section.content.join('<br/>')
                : String(section.content);

            // Check if content contains nested JSON (corruption case)
            if (typeof contentHtml === 'string' && contentHtml.trim().startsWith('{')) {
                try {
                    const nestedData = JSON.parse(contentHtml);
                    if (nestedData.metadata?.dataFormat === 'multi-note' && nestedData.notes && nestedData.notes.length > 0) {
                        console.warn('Found nested multi-note data in section content, extracting first note...');
                        result.warnings.push('Detected corrupted nested multi-note data, extracting content');
                        // Extract content from the first note in the nested data
                        const firstNestedNote = nestedData.notes[0];
                        contentHtml = firstNestedNote.content || 'Start writing your emergency information here...';
                    }
                } catch (error) {
                    console.warn('Failed to parse potential nested JSON:', error);
                    // If parsing fails, treat as regular content
                }
            }

            const note = createNote({
                title: section.title || 'Untitled Note',
                content: contentHtml
            });

            // Preserve original ID if possible
            note.id = section.id;
            
            return updateNoteMetadata(note);
        });

        // Update data structure
        data.notes = migratedNotes;
        data.metadata.dataFormat = 'multi-note';
        data.metadata.activeNoteId = migratedNotes.length > 0 ? migratedNotes[0].id : undefined;
        
        // Keep legacy sections for backward compatibility initially
        // They can be removed in a future migration step
        
        result.migratedNotesCount = migratedNotes.length;
        result.success = true;
        
        if (migratedNotes.length > 0) {
            result.warnings.push(`Successfully migrated ${migratedNotes.length} sections to notes`);
        }

    } catch (error) {
        result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
}

/**
 * Create enhanced data structure with version history support
 */
export function createEnhancedData(baseData: DecryptedData): EnhancedDecryptedData {
    return {
        ...baseData,
        versionHistory: [],
        settings: {
            autoSave: {
                enabled: true,
                intervalMs: 30000 // 30 seconds
            },
            defaultNoteTitle: 'New Note',
            maxNotesPerFile: 100
        }
    };
}

/**
 * Find note by ID
 */
export function findNoteById(data: DecryptedData, noteId: string): Note | undefined {
    return data.notes?.find(note => note.id === noteId);
}

/**
 * Add or update a note in the data structure
 */
export function upsertNote(data: DecryptedData, note: Note): DecryptedData {
    const updatedNote = updateNoteMetadata(note);
    
    if (!data.notes) {
        data.notes = [updatedNote];
    } else {
        const existingIndex = data.notes.findIndex(n => n.id === note.id);
        
        if (existingIndex >= 0) {
            data.notes[existingIndex] = updatedNote;
        } else {
            data.notes.push(updatedNote);
        }
    }
    
    // Update metadata
    data.metadata.lastModified = new Date().toISOString();
    data.metadata.activeNoteId = note.id;
    
    return data;
}

/**
 * Remove a note from the data structure
 */
export function removeNote(data: DecryptedData, noteId: string): DecryptedData {
    if (!data.notes) return data;
    
    data.notes = data.notes.filter(note => note.id !== noteId);
    
    // Update active note if the removed note was active
    if (data.metadata.activeNoteId === noteId) {
        data.metadata.activeNoteId = data.notes.length > 0 ? data.notes[0].id : undefined;
    }
    
    data.metadata.lastModified = new Date().toISOString();
    
    return data;
}

/**
 * Reorder notes
 */
export function reorderNotes(data: DecryptedData, noteIds: string[]): DecryptedData {
    if (!data.notes) return data;
    
    const noteMap = new Map(data.notes.map(note => [note.id, note]));
    const reorderedNotes: Note[] = [];
    
    // Add notes in the specified order
    for (const id of noteIds) {
        const note = noteMap.get(id);
        if (note) {
            reorderedNotes.push(note);
            noteMap.delete(id);
        }
    }
    
    // Add any remaining notes that weren't in the reorder list
    for (const note of noteMap.values()) {
        reorderedNotes.push(note);
    }
    
    data.notes = reorderedNotes;
    data.metadata.lastModified = new Date().toISOString();
    
    return data;
}

/**
 * Create a version snapshot of a note
 */
export function createNoteVersion(
    note: Note, 
    changeType: NoteVersion['changeType'], 
    changeSummary?: string
): NoteVersion {
    return {
        id: uuidv4(),
        noteId: note.id,
        content: note.content,
        title: note.title,
        timestamp: new Date().toISOString(),
        changeType,
        changeSummary
    };
}

/**
 * Add version to history with retention policy
 */
export function addVersionToHistory(
    data: EnhancedDecryptedData, 
    version: NoteVersion
): EnhancedDecryptedData {
    if (!data.versionHistory) {
        data.versionHistory = [];
    }
    
    let noteHistory = data.versionHistory.find(h => h.noteId === version.noteId);
    
    if (!noteHistory) {
        noteHistory = {
            noteId: version.noteId,
            versions: [],
            retentionPolicy: {
                maxVersions: 50,
                maxAgeInDays: 30
            }
        };
        data.versionHistory.push(noteHistory);
    }
    
    // Add new version
    noteHistory.versions.push(version);
    
    // Apply retention policy
    applyRetentionPolicy(noteHistory);
    
    return data;
}

/**
 * Apply retention policy to version history
 */
function applyRetentionPolicy(history: VersionHistory): void {
    const now = new Date();
    const maxAge = history.retentionPolicy.maxAgeInDays * 24 * 60 * 60 * 1000;
    
    // Remove versions older than max age
    history.versions = history.versions.filter(version => {
        const versionAge = now.getTime() - new Date(version.timestamp).getTime();
        return versionAge <= maxAge;
    });
    
    // Keep only the most recent versions up to maxVersions
    if (history.versions.length > history.retentionPolicy.maxVersions) {
        history.versions.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        history.versions = history.versions.slice(0, history.retentionPolicy.maxVersions);
    }
}

/**
 * Get version history for a specific note
 */
export function getNoteVersionHistory(
    data: EnhancedDecryptedData, 
    noteId: string
): NoteVersion[] {
    const noteHistory = data.versionHistory?.find(h => h.noteId === noteId);
    return noteHistory?.versions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ) || [];
}

/**
 * Restore note to a specific version
 */
export function restoreNoteToVersion(
    data: EnhancedDecryptedData, 
    noteId: string, 
    versionId: string
): { success: boolean; note?: Note; error?: string } {
    const versions = getNoteVersionHistory(data, noteId);
    const targetVersion = versions.find(v => v.id === versionId);
    
    if (!targetVersion) {
        return { success: false, error: 'Version not found' };
    }
    
    const currentNote = findNoteById(data, noteId);
    if (!currentNote) {
        return { success: false, error: 'Note not found' };
    }
    
    // Create version of current state before restoring
    const currentVersion = createNoteVersion(currentNote, 'edit', 'Before restore');
    addVersionToHistory(data, currentVersion);
    
    // Restore note to target version
    const restoredNote: Note = {
        ...currentNote,
        content: targetVersion.content,
        title: targetVersion.title,
        updatedAt: new Date().toISOString()
    };
    
    upsertNote(data, restoredNote);
    
    // Create version entry for restore action
    const restoreVersion = createNoteVersion(
        restoredNote, 
        'edit', 
        `Restored to version from ${targetVersion.timestamp}`
    );
    addVersionToHistory(data, restoreVersion);
    
    return { success: true, note: restoredNote };
}

/**
 * Validate data structure integrity
 */
export function validateDataStructure(data: DecryptedData): { 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[] 
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check metadata
    if (!data.metadata) {
        errors.push('Missing metadata');
    } else {
        if (!data.metadata.version) {
            warnings.push('Missing version in metadata');
        }
        if (!data.metadata.dataFormat) {
            warnings.push('Missing dataFormat in metadata');
        }
    }
    
    // Validate notes if in multi-note format
    if (data.metadata?.dataFormat === 'multi-note' && data.notes) {
        const noteIds = new Set<string>();
        
        for (const note of data.notes) {
            if (!note.id) {
                errors.push('Note missing ID');
            } else if (noteIds.has(note.id)) {
                errors.push(`Duplicate note ID: ${note.id}`);
            } else {
                noteIds.add(note.id);
            }
            
            if (!note.title) {
                warnings.push(`Note ${note.id} missing title`);
            }
            
            if (note.content === undefined) {
                warnings.push(`Note ${note.id} missing content`);
            }
        }
        
        // Validate active note ID
        if (data.metadata.activeNoteId && !noteIds.has(data.metadata.activeNoteId)) {
            errors.push('Active note ID does not exist in notes');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}