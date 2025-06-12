'use client'

import { useMemo } from 'react'
import { ArrowLeft, FileText, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NoteVersion } from '@/types/data'
import { formatDistanceToNow } from 'date-fns'

interface VersionDiffViewerProps {
    oldVersion: NoteVersion
    newVersion: NoteVersion
    onClose: () => void
    onRestoreVersion?: (versionId: string) => void
}

interface DiffChunk {
    type: 'added' | 'removed' | 'unchanged'
    content: string
    lineNumber?: number
}

// Simple diff algorithm for HTML content
function computeHtmlDiff(oldHtml: string, newHtml: string): DiffChunk[] {
    // Strip HTML tags for text comparison, but keep track of structure
    const stripTags = (html: string) => html.replace(/<[^>]*>/g, '')
    const oldText = stripTags(oldHtml)
    const newText = stripTags(newHtml)
    
    // Simple word-based diff
    const oldWords = oldText.split(/\s+/).filter(w => w.length > 0)
    const newWords = newText.split(/\s+/).filter(w => w.length > 0)
    
    const chunks: DiffChunk[] = []
    let oldIndex = 0
    let newIndex = 0
    
    while (oldIndex < oldWords.length || newIndex < newWords.length) {
        const oldWord = oldWords[oldIndex]
        const newWord = newWords[newIndex]
        
        if (oldIndex >= oldWords.length) {
            // Only new words remaining
            chunks.push({ type: 'added', content: newWord })
            newIndex++
        } else if (newIndex >= newWords.length) {
            // Only old words remaining
            chunks.push({ type: 'removed', content: oldWord })
            oldIndex++
        } else if (oldWord === newWord) {
            // Words match
            chunks.push({ type: 'unchanged', content: oldWord })
            oldIndex++
            newIndex++
        } else {
            // Words differ - try to find best match
            const oldInNew = newWords.slice(newIndex).indexOf(oldWord)
            const newInOld = oldWords.slice(oldIndex).indexOf(newWord)
            
            if (oldInNew !== -1 && (newInOld === -1 || oldInNew < newInOld)) {
                // Old word found later in new text - mark intermediate as added
                chunks.push({ type: 'added', content: newWord })
                newIndex++
            } else if (newInOld !== -1) {
                // New word found later in old text - mark intermediate as removed
                chunks.push({ type: 'removed', content: oldWord })
                oldIndex++
            } else {
                // No match found - mark as changed
                chunks.push({ type: 'removed', content: oldWord })
                chunks.push({ type: 'added', content: newWord })
                oldIndex++
                newIndex++
            }
        }
    }
    
    return chunks
}

// Advanced diff that preserves HTML structure
function computeAdvancedHtmlDiff(oldHtml: string, newHtml: string): DiffChunk[] {
    // For now, use simple approach. In production, consider using a library like diff-match-patch
    const lines1 = oldHtml.split('\n')
    const lines2 = newHtml.split('\n')
    
    const chunks: DiffChunk[] = []
    const maxLines = Math.max(lines1.length, lines2.length)
    
    for (let i = 0; i < maxLines; i++) {
        const line1 = lines1[i] || ''
        const line2 = lines2[i] || ''
        
        if (line1 === line2) {
            if (line1) {
                chunks.push({ type: 'unchanged', content: line1, lineNumber: i + 1 })
            }
        } else {
            if (line1) {
                chunks.push({ type: 'removed', content: line1, lineNumber: i + 1 })
            }
            if (line2) {
                chunks.push({ type: 'added', content: line2, lineNumber: i + 1 })
            }
        }
    }
    
    return chunks
}

export default function VersionDiffViewer({
    oldVersion,
    newVersion,
    onClose,
    onRestoreVersion
}: VersionDiffViewerProps) {
    const diffChunks = useMemo(() => {
        return computeAdvancedHtmlDiff(oldVersion.content, newVersion.content)
    }, [oldVersion.content, newVersion.content])

    const titleChanged = oldVersion.title !== newVersion.title
    const hasContentChanges = diffChunks.some(chunk => chunk.type !== 'unchanged')

    const renderDiffChunk = (chunk: DiffChunk, index: number) => {
        const baseClasses = "font-mono text-sm p-2 border-l-4 whitespace-pre-wrap"
        let classes = baseClasses
        let prefix = ''
        
        switch (chunk.type) {
            case 'added':
                classes += " bg-green-50 border-green-400 text-green-800"
                prefix = '+ '
                break
            case 'removed':
                classes += " bg-red-50 border-red-400 text-red-800"
                prefix = '- '
                break
            case 'unchanged':
                classes += " bg-gray-50 border-gray-200 text-gray-600"
                prefix = '  '
                break
        }

        return (
            <div key={index} className={classes}>
                <span className="text-gray-400 mr-2 select-none">
                    {chunk.lineNumber?.toString().padStart(3, ' ')}
                </span>
                <span className="text-gray-400 mr-2 select-none">{prefix}</span>
                <span dangerouslySetInnerHTML={{ __html: chunk.content }} />
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div className="flex items-center space-x-2">
                            <FileText className="h-5 w-5 text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Version Comparison</h3>
                        </div>
                    </div>
                    {onRestoreVersion && (
                        <Button
                            variant="outline"
                            onClick={() => onRestoreVersion(oldVersion.id)}
                        >
                            Restore This Version
                        </Button>
                    )}
                </div>
            </div>

            {/* Version Info */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                    {/* Old Version */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                            <span className="text-sm font-medium text-red-800">Previous Version</span>
                        </div>
                        <p className="text-sm text-red-700 font-medium">{oldVersion.title}</p>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-red-600">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(oldVersion.timestamp), { addSuffix: true })}</span>
                        </div>
                        {oldVersion.changeSummary && (
                            <p className="text-xs text-red-600 mt-1 italic">{oldVersion.changeSummary}</p>
                        )}
                    </div>

                    {/* New Version */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span className="text-sm font-medium text-green-800">Current Version</span>
                        </div>
                        <p className="text-sm text-green-700 font-medium">{newVersion.title}</p>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-green-600">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(newVersion.timestamp), { addSuffix: true })}</span>
                        </div>
                        {newVersion.changeSummary && (
                            <p className="text-xs text-green-600 mt-1 italic">{newVersion.changeSummary}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Title Changes */}
            {titleChanged && (
                <div className="p-4 border-b border-gray-200 bg-yellow-50">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Title Changed</h4>
                    <div className="space-y-1">
                        <div className="text-sm p-2 bg-red-50 border-l-4 border-red-400 text-red-800">
                            <span className="text-red-400 mr-2">-</span>
                            {oldVersion.title}
                        </div>
                        <div className="text-sm p-2 bg-green-50 border-l-4 border-green-400 text-green-800">
                            <span className="text-green-400 mr-2">+</span>
                            {newVersion.title}
                        </div>
                    </div>
                </div>
            )}

            {/* Content Diff */}
            <div className="flex-1 overflow-y-auto">
                {hasContentChanges ? (
                    <div className="p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Content Changes</h4>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            {diffChunks.map((chunk, index) => renderDiffChunk(chunk, index))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No Content Changes</p>
                            <p className="text-sm">The content of this note hasn&apos;t changed between these versions.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-center space-x-6 text-xs">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-400 rounded"></div>
                        <span>Added</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-400 rounded"></div>
                        <span>Removed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-300 rounded"></div>
                        <span>Unchanged</span>
                    </div>
                </div>
            </div>
        </div>
    )
}