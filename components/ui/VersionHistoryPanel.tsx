'use client'

import { useState, useMemo } from 'react'
import { Clock, RotateCcw, Eye, GitBranch, Edit3, Plus, Trash2, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NoteVersion, Note } from '@/types/data'
import { formatDistanceToNow } from 'date-fns'

interface VersionHistoryPanelProps {
    versions: NoteVersion[]
    currentNote: Note
    onRestoreVersion: (versionId: string) => void
    onPreviewVersion: (version: NoteVersion) => void
    isLoading?: boolean
}

type VersionFilter = 'all' | 'create' | 'edit' | 'title_change' | 'delete'

const changeTypeConfig = {
    create: {
        icon: Plus,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        label: 'Created'
    },
    edit: {
        icon: Edit3,
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50',
        label: 'Content Changed'
    },
    title_change: {
        icon: Type,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50', 
        label: 'Title Changed'
    },
    delete: {
        icon: Trash2,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        label: 'Deleted'
    }
}

export default function VersionHistoryPanel({
    versions,
    currentNote,
    onRestoreVersion,
    onPreviewVersion,
    isLoading = false
}: VersionHistoryPanelProps) {
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
    const [filter, setFilter] = useState<VersionFilter>('all')

    // Filter versions based on selected filter
    const filteredVersions = useMemo(() => {
        if (filter === 'all') return versions
        return versions.filter(version => version.changeType === filter)
    }, [versions, filter])

    // Get unique change types for filter buttons
    const availableChangeTypes = useMemo(() => {
        const types = new Set(versions.map(v => v.changeType))
        return Array.from(types)
    }, [versions])

    const handlePreviewVersion = (version: NoteVersion) => {
        setSelectedVersionId(version.id)
        onPreviewVersion(version)
    }

    const handleRestoreVersion = (versionId: string) => {
        if (confirm('Are you sure you want to restore this version? This will create a new version with the restored content.')) {
            onRestoreVersion(versionId)
            setSelectedVersionId(null)
        }
    }

    const renderVersionItem = (version: NoteVersion, index: number) => {
        const config = changeTypeConfig[version.changeType]
        const Icon = config.icon
        const isSelected = selectedVersionId === version.id
        const isLatest = index === 0

        return (
            <div
                key={version.id}
                className={`
                    p-4 border rounded-lg transition-all duration-200 cursor-pointer
                    ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                    ${isLatest ? 'ring-2 ring-green-200' : ''}
                `}
                onClick={() => setSelectedVersionId(version.id)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                        {/* Change Type Icon */}
                        <div className={`p-2 rounded-full ${config.bgColor}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>

                        {/* Version Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${config.color}`}>
                                    {config.label}
                                </span>
                                {isLatest && (
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                        Latest
                                    </span>
                                )}
                            </div>
                            
                            <div className="mt-1">
                                <p className="text-sm text-gray-900 font-medium">
                                    {version.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}
                                </p>
                                {version.changeSummary && (
                                    <p className="text-xs text-gray-600 mt-1 italic">
                                        {version.changeSummary}
                                    </p>
                                )}
                            </div>

                            {/* Content Preview */}
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 max-h-20 overflow-hidden">
                                <div 
                                    dangerouslySetInnerHTML={{ 
                                        __html: version.content.length > 100 
                                            ? version.content.substring(0, 100) + '...'
                                            : version.content 
                                    }} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2 ml-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation()
                                handlePreviewVersion(version)
                            }}
                            disabled={isLoading}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        
                        {!isLatest && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleRestoreVersion(version.id)
                                }}
                                disabled={isLoading}
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (versions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <GitBranch className="h-12 w-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Version History</h3>
                <p className="text-sm text-center">
                    Version history will appear here as you make changes to your note.
                </p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
                    </div>
                    <span className="text-sm text-gray-500">
                        {filteredVersions.length} of {versions.length} versions
                    </span>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">
                    {currentNote.title}
                </p>
            </div>

            {/* Filters */}
            {availableChangeTypes.length > 1 && (
                <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={filter === 'all' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setFilter('all')}
                        >
                            All Changes
                        </Button>
                        {availableChangeTypes.map(type => {
                            const config = changeTypeConfig[type]
                            const Icon = config.icon
                            return (
                                <Button
                                    key={type}
                                    variant={filter === type ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setFilter(type)}
                                    className="flex items-center space-x-1"
                                >
                                    <Icon className="h-3 w-3" />
                                    <span>{config.label}</span>
                                </Button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Version List */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    {filteredVersions.map((version, index) => 
                        renderVersionItem(version, index)
                    )}
                </div>
            </div>

            {/* Footer Info */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Versions are kept for 30 days</span>
                    <span>Max 50 versions per note</span>
                </div>
            </div>
        </div>
    )
}