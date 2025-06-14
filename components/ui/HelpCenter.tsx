'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Book,
  Video,
  HelpCircle,
  PlayCircle,
  FileQuestion,
  Sparkles,
  ChevronRight,
  Clock,
  Eye,
  ThumbsUp,
  Filter,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { HelpCategory, HelpContentType, HelpArticle, VideoTutorial } from '@/types/help'
import { helpService } from '@/services/help-service'

interface HelpCenterProps {
  onClose?: () => void
  defaultCategory?: HelpCategory
  defaultType?: HelpContentType
}

export default function HelpCenter({
  onClose,
  defaultCategory = 'getting-started',
  defaultType = 'article'
}: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory>(defaultCategory)
  const [selectedType, setSelectedType] = useState<HelpContentType>(defaultType)
  const [articles, setArticles] = useState<HelpArticle[]>([])
  const [videos, setVideos] = useState<VideoTutorial[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null)

  useEffect(() => {
    // Load initial content
    loadContent()
  }, [selectedCategory])

  const loadContent = () => {
    const categoryArticles = helpService.getArticlesByCategory(selectedCategory)
    setArticles(categoryArticles)
    
    const allVideos = helpService.getVideoTutorials()
    setVideos(allVideos.filter(v => v.category === selectedCategory))
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      setIsSearching(true)
      const results = helpService.searchHelp(query)
      setSearchResults(results)
    } else {
      setIsSearching(false)
      setSearchResults([])
    }
  }

  const categories: { value: HelpCategory; label: string; icon: any }[] = [
    { value: 'getting-started', label: 'Getting Started', icon: Sparkles },
    { value: 'features', label: 'Features', icon: Book },
    { value: 'security', label: 'Security', icon: HelpCircle },
    { value: 'troubleshooting', label: 'Troubleshooting', icon: FileQuestion },
    { value: 'advanced', label: 'Advanced', icon: PlayCircle }
  ]

  const getCategoryIcon = (category: HelpCategory) => {
    const cat = categories.find(c => c.value === category)
    return cat ? cat.icon : HelpCircle
  }

  const handleArticleClick = (article: HelpArticle) => {
    setSelectedArticle(article)
    helpService.trackView(article.id)
  }

  const handleVideoClick = (video: VideoTutorial) => {
    setSelectedVideo(video)
    helpService.trackView(video.id)
  }

  const handleBackToList = () => {
    setSelectedArticle(null)
    setSelectedVideo(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Help Center</h2>
            <p className="text-gray-600">Find answers and learn how to use If I'm Gone</p>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {selectedArticle || selectedVideo ? (
          // Article/Video Viewer
          <div className="h-full flex flex-col">
            <div className="border-b px-6 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="mb-2"
              >
                ← Back to list
              </Button>
              {selectedArticle && (
                <div>
                  <h1 className="text-2xl font-bold">{selectedArticle.title}</h1>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {selectedArticle.readTime} min read
                    </span>
                    {selectedArticle.difficulty && (
                      <Badge variant="secondary">
                        {selectedArticle.difficulty}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {selectedVideo && (
                <div>
                  <h1 className="text-2xl font-bold">{selectedVideo.title}</h1>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {Math.ceil(selectedVideo.duration / 60)} min
                    </span>
                    <span className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {selectedVideo.viewCount} views
                    </span>
                  </div>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 px-6 py-6">
              {selectedArticle && (
                <div className="prose prose-lg max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedArticle.content.replace(/\n/g, '<br>')
                    }}
                  />
                  
                  {/* Related Articles */}
                  {selectedArticle.relatedArticles && selectedArticle.relatedArticles.length > 0 && (
                    <div className="mt-12 border-t pt-8">
                      <h3 className="text-xl font-semibold mb-4">Related Articles</h3>
                      <div className="space-y-3">
                        {selectedArticle.relatedArticles.map(articleId => {
                          const article = articles.find(a => a.id === articleId)
                          if (!article) return null
                          return (
                            <button
                              key={articleId}
                              onClick={() => handleArticleClick(article)}
                              className="flex items-center text-blue-600 hover:text-blue-800"
                            >
                              <ChevronRight className="h-4 w-4 mr-1" />
                              {article.title}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedVideo && (
                <div>
                  <div className="bg-black rounded-lg aspect-video mb-6">
                    <div className="h-full flex items-center justify-center text-white">
                      <p>Video player would be integrated here</p>
                    </div>
                  </div>
                  <p className="text-lg text-gray-700">{selectedVideo.description}</p>
                  
                  {/* Video Chapters */}
                  {selectedVideo.chapters && selectedVideo.chapters.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xl font-semibold mb-4">Chapters</h3>
                      <div className="space-y-2">
                        {selectedVideo.chapters.map((chapter, index) => (
                          <button
                            key={index}
                            className="w-full text-left p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{chapter.title}</span>
                              <span className="text-sm text-gray-500">
                                {Math.floor(chapter.startTime / 60)}:
                                {(chapter.startTime % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                            {chapter.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {chapter.description}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Feedback */}
            <div className="border-t px-6 py-4">
              <p className="text-sm text-gray-600 mb-2">Was this helpful?</p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const id = selectedArticle?.id || selectedVideo?.id
                    if (id) helpService.markHelpfulness(id, true)
                  }}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const id = selectedArticle?.id || selectedVideo?.id
                    if (id) helpService.markHelpfulness(id, false)
                  }}
                >
                  No
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Content List
          <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as HelpContentType)}>
            <div className="border-b px-6">
              <TabsList className="grid w-full max-w-lg grid-cols-4">
                <TabsTrigger value="article">Articles</TabsTrigger>
                <TabsTrigger value="video">Videos</TabsTrigger>
                <TabsTrigger value="tutorial">Tutorials</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex h-full">
              {/* Sidebar */}
              <div className="w-64 border-r p-4">
                <h3 className="font-semibold mb-4">Categories</h3>
                <div className="space-y-1">
                  {categories.map((category) => {
                    const Icon = category.icon
                    return (
                      <button
                        key={category.value}
                        onClick={() => setSelectedCategory(category.value)}
                        className={`
                          w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                          ${selectedCategory === category.value
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-gray-100'
                          }
                        `}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{category.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Quick Links */}
                <div className="mt-8">
                  <h3 className="font-semibold mb-4">Quick Links</h3>
                  <div className="space-y-2">
                    <a href="#" className="block text-sm text-blue-600 hover:text-blue-800">
                      Contact Support
                    </a>
                    <a href="#" className="block text-sm text-blue-600 hover:text-blue-800">
                      Report an Issue
                    </a>
                    <a href="#" className="block text-sm text-blue-600 hover:text-blue-800">
                      Feature Requests
                    </a>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <ScrollArea className="flex-1 p-6">
                {isSearching ? (
                  // Search Results
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Search Results ({searchResults.length})
                    </h3>
                    <div className="space-y-4">
                      {searchResults.map((result) => (
                        <Card
                          key={result.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            const content = helpService.getContent(result.id)
                            if (content?.type === 'article') {
                              const article = articles.find(a => a.id === result.id)
                              if (article) handleArticleClick(article)
                            } else if (content?.type === 'video') {
                              const video = videos.find(v => v.id === result.id)
                              if (video) handleVideoClick(video)
                            }
                          }}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-lg">{result.title}</CardTitle>
                              <Badge variant="secondary">
                                {result.type}
                              </Badge>
                            </div>
                            <CardDescription>{result.excerpt}</CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Category Content
                  <>
                    <TabsContent value="article" className="mt-0">
                      <div className="space-y-4">
                        {articles.map((article) => (
                          <Card
                            key={article.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleArticleClick(article)}
                          >
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-lg">{article.title}</CardTitle>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary">
                                    {article.readTime} min
                                  </Badge>
                                  {article.difficulty && (
                                    <Badge variant="outline">
                                      {article.difficulty}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <CardDescription>{article.excerpt}</CardDescription>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="video" className="mt-0">
                      <div className="grid grid-cols-2 gap-4">
                        {videos.map((video) => (
                          <Card
                            key={video.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleVideoClick(video)}
                          >
                            <div className="aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center">
                              <Video className="h-12 w-12 text-gray-400" />
                            </div>
                            <CardHeader>
                              <CardTitle className="text-base">{video.title}</CardTitle>
                              <CardDescription className="line-clamp-2">
                                {video.description}
                              </CardDescription>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {Math.ceil(video.duration / 60)} min
                                </span>
                                <span className="flex items-center">
                                  <Eye className="h-3 w-3 mr-1" />
                                  {video.viewCount}
                                </span>
                              </div>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="tutorial" className="mt-0">
                      <div className="text-center py-8 text-gray-500">
                        <PlayCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Interactive tutorials coming soon</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="faq" className="mt-0">
                      <div className="text-center py-8 text-gray-500">
                        <FileQuestion className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Frequently asked questions coming soon</p>
                      </div>
                    </TabsContent>
                  </>
                )}
              </ScrollArea>
            </div>
          </Tabs>
        )}
      </div>
    </div>
  )
}