export type HelpContentType = 'tooltip' | 'article' | 'video' | 'tour' | 'faq' | 'tutorial'
export type HelpCategory = 'getting-started' | 'features' | 'security' | 'troubleshooting' | 'advanced'
export type HelpTrigger = 'hover' | 'click' | 'focus' | 'manual' | 'auto'

export interface HelpContent {
  id: string
  type: HelpContentType
  category: HelpCategory
  title: string
  content: string
  shortDescription?: string
  videoUrl?: string
  duration?: number // in seconds for videos
  steps?: TutorialStep[]
  relatedArticles?: string[]
  tags: string[]
  createdAt: string
  updatedAt: string
  viewCount?: number
  helpful?: number
  notHelpful?: number
}

export interface TutorialStep {
  id: string
  title: string
  content: string
  targetElement?: string // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right'
  action?: string // e.g., 'click', 'type', 'scroll'
  nextTrigger?: 'click' | 'auto' | 'complete'
  delay?: number // milliseconds before auto-advance
}

export interface HelpContext {
  page?: string
  component?: string
  feature?: string
  action?: string
  userRole?: string
  accountAge?: number
  completionLevel?: number
}

export interface HelpTooltipConfig {
  content: string
  trigger?: HelpTrigger
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  maxWidth?: number
  showArrow?: boolean
  interactive?: boolean
}

export interface HelpArticle {
  id: string
  title: string
  slug: string
  category: HelpCategory
  content: string // Markdown content
  excerpt: string
  tags: string[]
  readTime: number // minutes
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  prerequisites?: string[]
  relatedArticles?: string[]
  lastUpdated: string
  author?: string
}

export interface VideoTutorial {
  id: string
  title: string
  description: string
  videoUrl: string
  thumbnailUrl?: string
  duration: number // seconds
  category: HelpCategory
  tags: string[]
  transcript?: string
  chapters?: VideoChapter[]
  viewCount: number
  completionRate?: number
}

export interface VideoChapter {
  title: string
  startTime: number // seconds
  endTime: number
  description?: string
}

export interface HelpSearchResult {
  id: string
  type: HelpContentType
  title: string
  excerpt: string
  relevance: number
  category: HelpCategory
  url?: string
}

export interface UserHelpProgress {
  userId: string
  viewedArticles: string[]
  completedTutorials: string[]
  watchedVideos: { videoId: string; progress: number }[]
  dismissedTooltips: string[]
  helpfulArticles: string[]
  notHelpfulArticles: string[]
  lastViewedAt: Record<string, string>
}

export interface HelpSettings {
  showTooltips: boolean
  showTutorialPrompts: boolean
  autoPlayVideos: boolean
  preferredContentType: HelpContentType
  dismissedTours: string[]
  completedOnboarding: boolean
}