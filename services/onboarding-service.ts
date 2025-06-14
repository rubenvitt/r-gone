interface OnboardingData {
  profile: {
    displayName: string
    timezone: string
    notifications: boolean
  }
  security: {
    backupReminders: boolean
    twoFactorEnabled: boolean
    emergencyKitCreated: boolean
  }
  priorities: string[]
  skippedSteps: string[]
  completedAt?: string
}

class OnboardingService {
  private readonly STORAGE_KEY = 'onboardingData'
  private readonly COMPLETED_KEY = 'onboardingCompleted'

  /**
   * Check if user has completed onboarding
   */
  hasCompletedOnboarding(): boolean {
    try {
      return localStorage.getItem(this.COMPLETED_KEY) === 'true'
    } catch {
      return false
    }
  }

  /**
   * Get saved onboarding data
   */
  getOnboardingData(): OnboardingData | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  /**
   * Save onboarding completion
   */
  completeOnboarding(data: OnboardingData): void {
    try {
      const completedData = {
        ...data,
        completedAt: new Date().toISOString()
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(completedData))
      localStorage.setItem(this.COMPLETED_KEY, 'true')
    } catch (error) {
      console.error('Failed to save onboarding data:', error)
    }
  }

  /**
   * Reset onboarding (for testing or re-running)
   */
  resetOnboarding(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(this.COMPLETED_KEY)
    } catch (error) {
      console.error('Failed to reset onboarding:', error)
    }
  }

  /**
   * Check if user should see onboarding based on their progress
   */
  shouldShowOnboarding(metrics: {
    contactsCount: number
    assetsCount: number
    filesCount: number
    messagesCount: number
  }): boolean {
    // Already completed onboarding
    if (this.hasCompletedOnboarding()) {
      return false
    }

    // Show onboarding if user has very little data
    const totalItems = metrics.contactsCount + metrics.assetsCount + 
                      metrics.filesCount + metrics.messagesCount
    
    return totalItems < 2
  }

  /**
   * Get recommended next steps based on onboarding data
   */
  getNextSteps(data: OnboardingData | null): string[] {
    if (!data) return []

    const steps: string[] = []

    // Based on priorities
    if (data.priorities.includes('contacts')) {
      steps.push('Add at least 3 emergency contacts')
    }
    if (data.priorities.includes('documents')) {
      steps.push('Upload your most important documents')
    }
    if (data.priorities.includes('assets')) {
      steps.push('Document your digital accounts and passwords')
    }
    if (data.priorities.includes('messages')) {
      steps.push('Write a message for your loved ones')
    }

    // Based on security settings
    if (data.security.twoFactorEnabled) {
      steps.push('Complete two-factor authentication setup')
    }
    if (data.security.emergencyKitCreated) {
      steps.push('Download and print your emergency access kit')
    }

    return steps
  }
}

export const onboardingService = new OnboardingService()