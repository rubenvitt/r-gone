'use client'

import {
  HelpContent,
  HelpCategory,
  HelpContentType,
  HelpContext,
  HelpArticle,
  VideoTutorial,
  HelpSearchResult,
  UserHelpProgress,
  HelpSettings,
  TutorialStep
} from '@/types/help'

export class HelpService {
  private static instance: HelpService
  private helpContent: Map<string, HelpContent> = new Map()
  private userProgress: UserHelpProgress | null = null
  private settings: HelpSettings = {
    showTooltips: true,
    showTutorialPrompts: true,
    autoPlayVideos: false,
    preferredContentType: 'article',
    dismissedTours: [],
    completedOnboarding: false
  }

  public static getInstance(): HelpService {
    if (!HelpService.instance) {
      HelpService.instance = new HelpService()
    }
    return HelpService.instance
  }

  constructor() {
    this.loadSettings()
    this.initializeDefaultContent()
  }

  /**
   * Initialize default help content
   */
  private initializeDefaultContent() {
    // Getting Started Articles
    this.addContent({
      id: 'getting-started-overview',
      type: 'article',
      category: 'getting-started',
      title: 'Welcome to If I\'m Gone',
      content: `# Welcome to If I'm Gone

If I'm Gone is a secure digital legacy management system that helps you organize and protect important information for your loved ones.

## Key Features

- **Secure Storage**: Military-grade encryption for all your sensitive data
- **Emergency Access**: Controlled access for trusted contacts in emergencies
- **Document Management**: Store and organize important documents
- **Message System**: Create messages to be delivered under specific conditions
- **Asset Tracking**: Keep track of digital and physical assets

## Getting Started

1. Complete your profile setup
2. Add emergency contacts
3. Upload important documents
4. Create messages for your loved ones
5. Set up emergency access rules

## Security First

All your data is encrypted using industry-standard encryption. Only you have access to your master key.`,
      shortDescription: 'Learn the basics of using If I\'m Gone',
      tags: ['welcome', 'overview', 'basics'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Security Help
    this.addContent({
      id: 'security-encryption',
      type: 'article',
      category: 'security',
      title: 'Understanding Encryption',
      content: `# Understanding Encryption in If I'm Gone

## How We Protect Your Data

Your data is protected using multiple layers of encryption:

1. **Client-Side Encryption**: Data is encrypted on your device before transmission
2. **Zero-Knowledge Architecture**: We never have access to your unencrypted data
3. **OpenPGP Standard**: Industry-standard encryption protocols

## Your Master Password

- Choose a strong, unique password
- Never share your master password
- Consider using a password manager
- Enable two-factor authentication for added security

## Backup Your Keys

It's crucial to backup your encryption keys. Without them, your data cannot be recovered.`,
      shortDescription: 'Learn how we keep your data secure',
      tags: ['encryption', 'security', 'privacy'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Feature Tutorials
    this.addContent({
      id: 'tutorial-add-contact',
      type: 'tutorial',
      category: 'features',
      title: 'Adding Emergency Contacts',
      content: 'Step-by-step guide to adding emergency contacts',
      steps: [
        {
          id: 'step1',
          title: 'Navigate to Contacts',
          content: 'Click on the "Contacts" tab in the main navigation',
          targetElement: '[data-help="nav-contacts"]',
          position: 'bottom',
          nextTrigger: 'click'
        },
        {
          id: 'step2',
          title: 'Click Add Contact',
          content: 'Click the "Add Contact" button to start adding a new contact',
          targetElement: '[data-help="add-contact-button"]',
          position: 'left',
          nextTrigger: 'click'
        },
        {
          id: 'step3',
          title: 'Fill Contact Details',
          content: 'Enter the contact\'s name, email, and relationship',
          targetElement: '[data-help="contact-form"]',
          position: 'right',
          nextTrigger: 'complete'
        },
        {
          id: 'step4',
          title: 'Set Access Permissions',
          content: 'Choose what information this contact can access in an emergency',
          targetElement: '[data-help="access-permissions"]',
          position: 'top',
          nextTrigger: 'complete'
        }
      ],
      tags: ['contacts', 'tutorial', 'emergency'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Video Tutorials
    this.addContent({
      id: 'video-quick-start',
      type: 'video',
      category: 'getting-started',
      title: 'Quick Start Guide',
      content: 'Get up and running in 5 minutes',
      videoUrl: '/videos/quick-start.mp4',
      duration: 300,
      tags: ['video', 'quickstart', 'beginner'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // FAQ Content
    this.addContent({
      id: 'faq-forgot-password',
      type: 'faq',
      category: 'troubleshooting',
      title: 'What if I forget my master password?',
      content: `If you forget your master password, you can recover your account using:

1. **Recovery Key**: Use the recovery key you saved during setup
2. **Emergency Contacts**: Your designated emergency contacts can help verify your identity
3. **Support Team**: Contact our support team for identity verification

**Important**: Without your master password or recovery key, we cannot decrypt your data due to our zero-knowledge architecture.`,
      shortDescription: 'Password recovery options',
      tags: ['password', 'recovery', 'faq'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Dashboard Help
    this.addContent({
      id: 'dashboard-overview',
      type: 'article',
      category: 'features',
      title: 'Understanding Your Dashboard',
      content: `# Understanding Your Dashboard

The dashboard is your central hub for managing your digital legacy. Here's what each section means:

## Setup Completion
This percentage shows how complete your digital legacy preparation is. Aim for 100% by:
- Adding at least 5 emergency contacts
- Documenting 10+ digital assets
- Uploading 8+ important files
- Creating 3+ messages

## System Metrics
Each metric card shows:
- **Current Status**: Excellent (green), Good (blue), Warning (yellow), or Critical (red)
- **Progress Bar**: Visual representation of completion
- **Quick Actions**: Direct links to improve that area

## Recent Activity
Track all changes and access to your account. This helps you:
- Monitor account security
- Remember recent updates
- Track emergency access attempts

## Quick Actions
One-click access to common tasks:
- Create new documents
- Add emergency contacts
- Use templates for quick setup
- Test emergency access system`,
      shortDescription: 'Learn how to use your dashboard effectively',
      tags: ['dashboard', 'overview', 'metrics', 'getting-started'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Messages Help
    this.addContent({
      id: 'messages-guide',
      type: 'article',
      category: 'features',
      title: 'Creating and Managing Messages',
      content: `# Creating and Managing Messages

## Message Types

### Personal Messages
Heartfelt messages to specific individuals:
- Farewell letters
- Expressions of gratitude
- Personal advice
- Apologies or explanations

### Instructions
Practical guidance for handling affairs:
- Financial instructions
- Business continuity plans
- Digital asset access
- Legal document locations

### Conditional Messages
Messages triggered by specific events:
- Time-based delivery (anniversaries, birthdays)
- Milestone events (graduation, marriage)
- Emergency situations

## Delivery Options

1. **Immediate**: Delivered upon emergency access activation
2. **Scheduled**: Set specific dates for delivery
3. **Conditional**: Based on specific triggers
4. **Manual**: Requires manual approval

## Best Practices

- Write messages when you're calm and thoughtful
- Review and update messages annually
- Test delivery with trusted contacts
- Include both emotional and practical content
- Consider recording video messages for special impact`,
      shortDescription: 'Guide to creating meaningful messages',
      tags: ['messages', 'communication', 'delivery', 'conditional'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // File Management Help
    this.addContent({
      id: 'file-management',
      type: 'article',
      category: 'features',
      title: 'Managing Important Documents',
      content: `# Managing Important Documents

## What to Store

### Essential Documents
- Will and estate planning documents
- Insurance policies
- Property deeds and titles
- Tax returns (last 7 years)
- Medical directives
- Power of attorney documents

### Financial Records
- Bank account information
- Investment account details
- Retirement account beneficiaries
- Debt obligations
- Business agreements

### Personal Documents
- Birth certificates
- Marriage certificates
- Divorce decrees
- Adoption papers
- Military records

## Organization Tips

1. **Use Clear Names**: "2024-Tax-Return.pdf" not "doc1.pdf"
2. **Add Descriptions**: Include context for each file
3. **Tag Documents**: Use tags like "legal", "financial", "medical"
4. **Version Control**: Keep only current versions
5. **Regular Updates**: Review quarterly

## Security Features

- All files are encrypted at rest
- Version history is maintained
- Access logs track who views files
- Integrity checks prevent tampering`,
      shortDescription: 'Best practices for document storage',
      tags: ['files', 'documents', 'storage', 'organization'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Emergency Access Help
    this.addContent({
      id: 'emergency-access-setup',
      type: 'tutorial',
      category: 'security',
      title: 'Setting Up Emergency Access',
      content: 'Configure emergency access for trusted contacts',
      steps: [
        {
          id: 'step1',
          title: 'Understanding Emergency Access',
          content: 'Emergency access allows trusted contacts to access your information if something happens to you. You control what they can see and when.',
          position: 'bottom',
          nextTrigger: 'click'
        },
        {
          id: 'step2',
          title: 'Add Trusted Contacts',
          content: 'Select contacts who can request emergency access. Consider family members, close friends, or legal representatives.',
          targetElement: '[data-help="emergency-contacts"]',
          position: 'right',
          nextTrigger: 'complete'
        },
        {
          id: 'step3',
          title: 'Set Waiting Period',
          content: 'Choose how long to wait before granting access (24-72 hours recommended). You\'ll be notified and can deny false requests.',
          targetElement: '[data-help="waiting-period"]',
          position: 'left',
          nextTrigger: 'complete'
        },
        {
          id: 'step4',
          title: 'Configure Access Levels',
          content: 'Decide what each contact can access: view-only, download files, or full access. Customize per contact based on trust level.',
          targetElement: '[data-help="access-levels"]',
          position: 'top',
          nextTrigger: 'complete'
        },
        {
          id: 'step5',
          title: 'Test the System',
          content: 'Run a test with a trusted contact to ensure the system works correctly. You can cancel test requests immediately.',
          targetElement: '[data-help="test-access"]',
          position: 'bottom',
          nextTrigger: 'click'
        }
      ],
      tags: ['emergency', 'access', 'security', 'contacts'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  /**
   * Add help content
   */
  addContent(content: HelpContent): void {
    this.helpContent.set(content.id, content)
  }

  /**
   * Get help content by ID
   */
  getContent(id: string): HelpContent | undefined {
    return this.helpContent.get(id)
  }

  /**
   * Get contextual help for current page/component
   */
  getContextualHelp(context: HelpContext): HelpContent[] {
    const results: HelpContent[] = []
    
    // Filter content based on context
    this.helpContent.forEach(content => {
      let relevance = 0
      
      // Check page match
      if (context.page && content.tags.includes(context.page)) {
        relevance += 3
      }
      
      // Check component match
      if (context.component && content.tags.includes(context.component)) {
        relevance += 2
      }
      
      // Check feature match
      if (context.feature && content.tags.includes(context.feature)) {
        relevance += 2
      }
      
      // Check user level
      if (context.completionLevel !== undefined) {
        if (context.completionLevel < 30 && content.category === 'getting-started') {
          relevance += 1
        }
      }
      
      if (relevance > 0) {
        results.push(content)
      }
    })
    
    // Sort by relevance and type preference
    return results.sort((a, b) => {
      if (a.type === this.settings.preferredContentType) return -1
      if (b.type === this.settings.preferredContentType) return 1
      return 0
    })
  }

  /**
   * Search help content
   */
  searchHelp(query: string): HelpSearchResult[] {
    const results: HelpSearchResult[] = []
    const searchTerms = query.toLowerCase().split(' ')
    
    this.helpContent.forEach(content => {
      let relevance = 0
      
      // Check title match
      const titleLower = content.title.toLowerCase()
      searchTerms.forEach(term => {
        if (titleLower.includes(term)) {
          relevance += 3
        }
      })
      
      // Check content match
      const contentLower = content.content.toLowerCase()
      searchTerms.forEach(term => {
        if (contentLower.includes(term)) {
          relevance += 1
        }
      })
      
      // Check tags match
      searchTerms.forEach(term => {
        if (content.tags.some(tag => tag.includes(term))) {
          relevance += 2
        }
      })
      
      if (relevance > 0) {
        results.push({
          id: content.id,
          type: content.type,
          title: content.title,
          excerpt: content.shortDescription || content.content.substring(0, 150) + '...',
          relevance,
          category: content.category
        })
      }
    })
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance)
  }

  /**
   * Get help articles by category
   */
  getArticlesByCategory(category: HelpCategory): HelpArticle[] {
    const articles: HelpArticle[] = []
    
    this.helpContent.forEach(content => {
      if (content.type === 'article' && content.category === category) {
        articles.push({
          id: content.id,
          title: content.title,
          slug: content.id,
          category: content.category,
          content: content.content,
          excerpt: content.shortDescription || '',
          tags: content.tags,
          readTime: Math.ceil(content.content.split(' ').length / 200), // Assume 200 wpm
          lastUpdated: content.updatedAt
        })
      }
    })
    
    return articles
  }

  /**
   * Get video tutorials
   */
  getVideoTutorials(): VideoTutorial[] {
    const videos: VideoTutorial[] = []
    
    this.helpContent.forEach(content => {
      if (content.type === 'video') {
        videos.push({
          id: content.id,
          title: content.title,
          description: content.content,
          videoUrl: content.videoUrl || '',
          duration: content.duration || 0,
          category: content.category,
          tags: content.tags,
          viewCount: content.viewCount || 0
        })
      }
    })
    
    return videos
  }

  /**
   * Track content view
   */
  trackView(contentId: string): void {
    const content = this.helpContent.get(contentId)
    if (content) {
      content.viewCount = (content.viewCount || 0) + 1
      
      // Update user progress
      if (this.userProgress) {
        if (!this.userProgress.viewedArticles.includes(contentId)) {
          this.userProgress.viewedArticles.push(contentId)
        }
        this.userProgress.lastViewedAt[contentId] = new Date().toISOString()
        this.saveUserProgress()
      }
    }
  }

  /**
   * Mark content as helpful/not helpful
   */
  markHelpfulness(contentId: string, helpful: boolean): void {
    const content = this.helpContent.get(contentId)
    if (content) {
      if (helpful) {
        content.helpful = (content.helpful || 0) + 1
      } else {
        content.notHelpful = (content.notHelpful || 0) + 1
      }
      
      // Update user progress
      if (this.userProgress) {
        if (helpful && !this.userProgress.helpfulArticles.includes(contentId)) {
          this.userProgress.helpfulArticles.push(contentId)
        } else if (!helpful && !this.userProgress.notHelpfulArticles.includes(contentId)) {
          this.userProgress.notHelpfulArticles.push(contentId)
        }
        this.saveUserProgress()
      }
    }
  }

  /**
   * Dismiss a tooltip
   */
  dismissTooltip(tooltipId: string): void {
    if (this.userProgress && !this.userProgress.dismissedTooltips.includes(tooltipId)) {
      this.userProgress.dismissedTooltips.push(tooltipId)
      this.saveUserProgress()
    }
  }

  /**
   * Check if tooltip should be shown
   */
  shouldShowTooltip(tooltipId: string): boolean {
    if (!this.settings.showTooltips) return false
    if (this.userProgress && this.userProgress.dismissedTooltips.includes(tooltipId)) {
      return false
    }
    return true
  }

  /**
   * Complete a tutorial
   */
  completeTutorial(tutorialId: string): void {
    if (this.userProgress && !this.userProgress.completedTutorials.includes(tutorialId)) {
      this.userProgress.completedTutorials.push(tutorialId)
      this.saveUserProgress()
    }
  }

  /**
   * Update video progress
   */
  updateVideoProgress(videoId: string, progress: number): void {
    if (this.userProgress) {
      const existing = this.userProgress.watchedVideos.find(v => v.videoId === videoId)
      if (existing) {
        existing.progress = progress
      } else {
        this.userProgress.watchedVideos.push({ videoId, progress })
      }
      this.saveUserProgress()
    }
  }

  /**
   * Get user progress
   */
  getUserProgress(): UserHelpProgress | null {
    return this.userProgress
  }

  /**
   * Update help settings
   */
  updateSettings(settings: Partial<HelpSettings>): void {
    this.settings = { ...this.settings, ...settings }
    this.saveSettings()
  }

  /**
   * Get current settings
   */
  getSettings(): HelpSettings {
    return this.settings
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('help-settings')
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) }
      }
      
      // Load user progress
      const progress = localStorage.getItem('help-progress')
      if (progress) {
        this.userProgress = JSON.parse(progress)
      } else {
        this.userProgress = {
          userId: 'current-user',
          viewedArticles: [],
          completedTutorials: [],
          watchedVideos: [],
          dismissedTooltips: [],
          helpfulArticles: [],
          notHelpfulArticles: [],
          lastViewedAt: {}
        }
      }
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('help-settings', JSON.stringify(this.settings))
    }
  }

  /**
   * Save user progress to localStorage
   */
  private saveUserProgress(): void {
    if (typeof window !== 'undefined' && this.userProgress) {
      localStorage.setItem('help-progress', JSON.stringify(this.userProgress))
    }
  }

  /**
   * Get suggested next steps based on user progress
   */
  getSuggestedContent(limit: number = 5): HelpContent[] {
    const suggestions: HelpContent[] = []
    
    // Prioritize getting-started content for new users
    if (!this.userProgress || this.userProgress.viewedArticles.length < 3) {
      this.helpContent.forEach(content => {
        if (content.category === 'getting-started' && 
            (!this.userProgress || !this.userProgress.viewedArticles.includes(content.id))) {
          suggestions.push(content)
        }
      })
    }
    
    // Add feature tutorials user hasn't completed
    this.helpContent.forEach(content => {
      if (content.type === 'tutorial' && 
          (!this.userProgress || !this.userProgress.completedTutorials.includes(content.id))) {
        suggestions.push(content)
      }
    })
    
    return suggestions.slice(0, limit)
  }

  /**
   * Check if user has completed onboarding
   */
  hasCompletedOnboarding(): boolean {
    return this.settings.completedOnboarding
  }

  /**
   * Mark onboarding as complete
   */
  completeOnboarding(): void {
    this.settings.completedOnboarding = true
    this.saveSettings()
  }
}

// Export singleton instance
export const helpService = HelpService.getInstance()