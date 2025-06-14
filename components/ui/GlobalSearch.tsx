'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Search,
  X,
  FileText,
  Users,
  Package,
  MessageSquare,
  Calendar,
  Shield,
  Clock,
  ChevronRight,
  Filter
} from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  content: string
  type: 'file' | 'contact' | 'asset' | 'message' | 'backup' | 'activity'
  category?: string
  lastModified?: Date
  relevanceScore: number
}

interface GlobalSearchProps {
  onNavigate?: (view: string, itemId?: string) => void
}

export default function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mock search data - in a real app this would come from a search service
  const mockData: SearchResult[] = [
    {
      id: '1',
      title: 'Bank Account Information',
      content: 'Chase Bank checking account details and routing numbers',
      type: 'file',
      category: 'Financial',
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24),
      relevanceScore: 0.95
    },
    {
      id: '2',
      title: 'Sarah Johnson',
      content: 'Emergency contact, spouse, phone: +1-555-0123',
      type: 'contact',
      category: 'Emergency',
      lastModified: new Date(Date.now() - 1000 * 60 * 30),
      relevanceScore: 0.88
    },
    {
      id: '3',
      title: 'Farewell Letter to Family',
      content: 'Personal message for loved ones in case of emergency',
      type: 'message',
      category: 'Personal',
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 2),
      relevanceScore: 0.82
    },
    {
      id: '4',
      title: 'Google Account',
      content: 'Gmail and Google Drive access credentials',
      type: 'asset',
      category: 'Digital Services',
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 12),
      relevanceScore: 0.75
    },
    {
      id: '5',
      title: 'Investment Portfolio',
      content: 'Stock investments and retirement accounts documentation',
      type: 'file',
      category: 'Financial',
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 48),
      relevanceScore: 0.68
    }
  ]

  // Perform search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    
    // Simulate API call delay
    const timeoutId = setTimeout(() => {
      const filtered = mockData
        .filter(item => 
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 8) // Limit results

      setResults(filtered)
      setSelectedIndex(-1)
      setIsSearching(false)
    }, 200)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultClick(results[selectedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          setSearchTerm('')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleResultClick = (result: SearchResult) => {
    const viewMap = {
      file: 'files',
      contact: 'contacts',
      asset: 'assets',
      message: 'messages',
      backup: 'backup',
      activity: 'dashboard'
    }

    onNavigate?.(viewMap[result.type], result.id)
    setIsOpen(false)
    setSearchTerm('')
  }

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'file': return FileText
      case 'contact': return Users
      case 'asset': return Package
      case 'message': return MessageSquare
      case 'backup': return Shield
      case 'activity': return Clock
    }
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div ref={searchRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search across all content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full md:w-80 px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('')
              setResults([])
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (searchTerm || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="p-3 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {results.length} result{results.length !== 1 ? 's' : ''} for "{searchTerm}"
                  </span>
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {results.map((result, index) => {
                  const Icon = getResultIcon(result.type)
                  const isSelected = index === selectedIndex
                  
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={`w-full p-4 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          result.type === 'file' ? 'bg-blue-100 text-blue-600' :
                          result.type === 'contact' ? 'bg-green-100 text-green-600' :
                          result.type === 'asset' ? 'bg-purple-100 text-purple-600' :
                          result.type === 'message' ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {result.title}
                            </h4>
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                              {result.category && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                  {result.category}
                                </span>
                              )}
                              <ChevronRight className="h-3 w-3 text-gray-400" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 truncate mb-1">
                            {result.content}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 capitalize">
                              {result.type}
                            </span>
                            {result.lastModified && (
                              <span className="text-xs text-gray-500">
                                {formatRelativeTime(result.lastModified)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              
              <div className="p-3 bg-gray-50 border-t">
                <p className="text-xs text-gray-500 text-center">
                  Use ↑↓ arrows to navigate, Enter to select, Esc to close
                </p>
              </div>
            </>
          ) : searchTerm ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">No results found</p>
              <p className="text-sm">Try searching for files, contacts, assets, or messages</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}