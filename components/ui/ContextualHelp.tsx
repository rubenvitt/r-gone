'use client'

import { useState, useEffect } from 'react'
import { HelpCircle, Book, Video, PlayCircle, ChevronRight, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { HelpContent, HelpContext, HelpSearchResult } from '@/types/help'
import { helpService } from '@/services/help-service'

interface ContextualHelpProps {
  context: HelpContext
  className?: string
  buttonText?: string
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'link'
  showIcon?: boolean
}

export default function ContextualHelp({
  context,
  className = '',
  buttonText = 'Help',
  buttonVariant = 'ghost',
  showIcon = true
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<HelpContent | null>(null)
  const [contextualContent, setContextualContent] = useState<HelpContent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<HelpSearchResult[]>([])

  useEffect(() => {
    // Load contextual help content
    const content = helpService.getContextualHelp(context)
    setContextualContent(content)
  }, [context])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const results = helpService.searchHelp(query)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  const handleContentSelect = (contentId: string) => {
    const content = helpService.getContent(contentId)
    if (content) {
      setSelectedContent(content)
      helpService.trackView(contentId)
    }
  }

  const handleHelpfulness = (helpful: boolean) => {
    if (selectedContent) {
      helpService.markHelpfulness(selectedContent.id, helpful)
    }
  }

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'article':
        return Book
      case 'video':
        return Video
      case 'tutorial':
        return PlayCircle
      default:
        return HelpCircle
    }
  }

  const getContentTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'article':
        return 'bg-blue-100 text-blue-800'
      case 'video':
        return 'bg-purple-100 text-purple-800'
      case 'tutorial':
        return 'bg-green-100 text-green-800'
      case 'faq':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <Button
        variant={buttonVariant}
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {showIcon && <HelpCircle className="h-4 w-4 mr-2" />}
        {buttonText}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Help & Resources</DialogTitle>
            <DialogDescription>
              Find answers, tutorials, and guides related to {context.page || 'this feature'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex gap-4 min-h-0">
            {/* Sidebar */}
            <div className="w-64 flex flex-col space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search help..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Content List */}
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {searchQuery ? (
                    // Search Results
                    searchResults.length > 0 ? (
                      searchResults.map((result) => {
                        const Icon = getContentIcon(result.type)
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleContentSelect(result.id)}
                            className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start space-x-3">
                              <Icon className="h-4 w-4 text-gray-400 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium truncate">
                                  {result.title}
                                </h4>
                                <p className="text-xs text-gray-500 line-clamp-2">
                                  {result.excerpt}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No results found
                      </p>
                    )
                  ) : (
                    // Contextual Content
                    <>
                      {contextualContent.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Recommended
                          </h3>
                          {contextualContent.map((content) => {
                            const Icon = getContentIcon(content.type)
                            return (
                              <button
                                key={content.id}
                                onClick={() => handleContentSelect(content.id)}
                                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-start space-x-3">
                                  <Icon className="h-4 w-4 text-gray-400 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium truncate">
                                      {content.title}
                                    </h4>
                                    <Badge
                                      variant="secondary"
                                      className={`text-xs mt-1 ${getContentTypeBadgeColor(content.type)}`}
                                    >
                                      {content.type}
                                    </Badge>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Suggested Content */}
                      <div className="mt-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Suggested Articles
                        </h3>
                        {helpService.getSuggestedContent(3).map((content) => {
                          const Icon = getContentIcon(content.type)
                          return (
                            <button
                              key={content.id}
                              onClick={() => handleContentSelect(content.id)}
                              className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-start space-x-3">
                                <Icon className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium truncate">
                                    {content.title}
                                  </h4>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Quick Links */}
              <div className="border-t pt-4 space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setIsOpen(false)
                    // Navigate to help center
                  }}
                >
                  <Book className="h-4 w-4 mr-2" />
                  Help Center
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setIsOpen(false)
                    // Navigate to video tutorials
                  }}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video Tutorials
                </Button>
              </div>
            </div>

            {/* Content Viewer */}
            <div className="flex-1 border-l pl-4">
              {selectedContent ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedContent.title}</h3>
                      <Badge
                        variant="secondary"
                        className={`text-xs mt-1 ${getContentTypeBadgeColor(selectedContent.type)}`}
                      >
                        {selectedContent.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedContent(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="prose prose-sm max-w-none">
                      {selectedContent.type === 'video' && selectedContent.videoUrl ? (
                        <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
                          <p className="text-white">Video player would go here</p>
                        </div>
                      ) : selectedContent.type === 'tutorial' && selectedContent.steps ? (
                        <div className="space-y-4">
                          {selectedContent.steps.map((step, index) => (
                            <div key={step.id} className="flex space-x-4">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-800">
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-medium">{step.title}</h4>
                                <p className="text-gray-600 mt-1">{step.content}</p>
                              </div>
                            </div>
                          ))}
                          <Button className="mt-4">
                            Start Tutorial
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: selectedContent.content.replace(/\n/g, '<br>')
                          }}
                        />
                      )}

                      {/* Related Articles */}
                      {selectedContent.relatedArticles && selectedContent.relatedArticles.length > 0 && (
                        <div className="mt-8 border-t pt-4">
                          <h4 className="font-medium mb-2">Related Articles</h4>
                          <div className="space-y-2">
                            {selectedContent.relatedArticles.map((articleId) => {
                              const related = helpService.getContent(articleId)
                              if (!related) return null
                              return (
                                <button
                                  key={articleId}
                                  onClick={() => handleContentSelect(articleId)}
                                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                >
                                  <ChevronRight className="h-3 w-3 mr-1" />
                                  {related.title}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Feedback */}
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-gray-600 mb-2">Was this helpful?</p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleHelpfulness(true)}
                      >
                        Yes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleHelpfulness(false)}
                      >
                        No
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Select an article to read</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}