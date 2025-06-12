'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AccessibilityState {
    reduceMotion: boolean
    highContrast: boolean
    fontSize: 'small' | 'medium' | 'large'
    screenReader: boolean
    keyboardNavigation: boolean
}

interface AccessibilityContextType {
    state: AccessibilityState
    updatePreference: (key: keyof AccessibilityState, value: any) => void
    announceToScreenReader: (message: string) => void
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

interface AccessibilityProviderProps {
    children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
    const [state, setState] = useState<AccessibilityState>({
        reduceMotion: false,
        highContrast: false,
        fontSize: 'medium',
        screenReader: false,
        keyboardNavigation: false
    })

    // Detect system preferences
    useEffect(() => {
        const detectPreferences = () => {
            const newState: Partial<AccessibilityState> = {}

            // Detect reduced motion preference
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                newState.reduceMotion = true
            }

            // Detect high contrast preference
            if (window.matchMedia('(prefers-contrast: high)').matches) {
                newState.highContrast = true
            }

            // Detect screen reader (simplified detection)
            const hasScreenReader = 
                navigator.userAgent.includes('NVDA') ||
                navigator.userAgent.includes('JAWS') ||
                navigator.userAgent.includes('VoiceOver') ||
                window.speechSynthesis !== undefined

            if (hasScreenReader) {
                newState.screenReader = true
            }

            setState(prev => ({ ...prev, ...newState }))
        }

        detectPreferences()

        // Listen for preference changes
        const mediaQueries = [
            window.matchMedia('(prefers-reduced-motion: reduce)'),
            window.matchMedia('(prefers-contrast: high)')
        ]

        const handleChange = () => detectPreferences()
        mediaQueries.forEach(mq => mq.addEventListener('change', handleChange))

        return () => {
            mediaQueries.forEach(mq => mq.removeEventListener('change', handleChange))
        }
    }, [])

    // Load saved preferences
    useEffect(() => {
        const savedPrefs = localStorage.getItem('accessibility-preferences')
        if (savedPrefs) {
            try {
                const parsed = JSON.parse(savedPrefs)
                setState(prev => ({ ...prev, ...parsed }))
            } catch (error) {
                console.warn('Failed to load accessibility preferences:', error)
            }
        }
    }, [])

    // Save preferences when they change
    useEffect(() => {
        localStorage.setItem('accessibility-preferences', JSON.stringify(state))
    }, [state])

    // Detect keyboard navigation
    useEffect(() => {
        let keyboardUsed = false

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab' && !keyboardUsed) {
                keyboardUsed = true
                setState(prev => ({ ...prev, keyboardNavigation: true }))
                document.body.classList.add('keyboard-navigation')
            }
        }

        const handleMouseDown = () => {
            if (keyboardUsed) {
                keyboardUsed = false
                setState(prev => ({ ...prev, keyboardNavigation: false }))
                document.body.classList.remove('keyboard-navigation')
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('mousedown', handleMouseDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('mousedown', handleMouseDown)
        }
    }, [])

    // Apply CSS classes based on preferences
    useEffect(() => {
        const body = document.body
        const classes = []

        if (state.reduceMotion) classes.push('reduce-motion')
        if (state.highContrast) classes.push('high-contrast')
        if (state.fontSize === 'large') classes.push('large-text')
        if (state.fontSize === 'small') classes.push('small-text')

        // Remove old classes
        body.classList.remove('reduce-motion', 'high-contrast', 'large-text', 'small-text')
        
        // Add new classes
        classes.forEach(cls => body.classList.add(cls))
    }, [state])

    const updatePreference = (key: keyof AccessibilityState, value: any) => {
        setState(prev => ({ ...prev, [key]: value }))
    }

    const announceToScreenReader = (message: string) => {
        const announcement = document.createElement('div')
        announcement.setAttribute('aria-live', 'polite')
        announcement.setAttribute('aria-atomic', 'true')
        announcement.setAttribute('class', 'sr-only')
        announcement.textContent = message
        
        document.body.appendChild(announcement)
        
        setTimeout(() => {
            document.body.removeChild(announcement)
        }, 1000)
    }

    return (
        <AccessibilityContext.Provider value={{
            state,
            updatePreference,
            announceToScreenReader
        }}>
            {children}
        </AccessibilityContext.Provider>
    )
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext)
    if (!context) {
        throw new Error('useAccessibility must be used within AccessibilityProvider')
    }
    return context
}

// CSS Classes to add to your global CSS
export const accessibilityStyles = `
/* Screen reader only content */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* Reduce motion preferences */
.reduce-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
}

/* High contrast mode */
.high-contrast {
    filter: contrast(150%);
}

.high-contrast button {
    border: 2px solid currentColor;
}

.high-contrast a {
    text-decoration: underline;
}

/* Font size adjustments */
.large-text {
    font-size: 1.2em;
}

.small-text {
    font-size: 0.9em;
}

/* Keyboard navigation focus */
.keyboard-navigation *:focus {
    outline: 3px solid #4A90E2 !important;
    outline-offset: 2px !important;
}

/* Skip link */
.skip-link {
    position: absolute;
    top: -40px;
    left: 6px;
    background: #4A90E2;
    color: white;
    padding: 8px;
    text-decoration: none;
    border-radius: 4px;
    z-index: 9999;
}

.skip-link:focus {
    top: 6px;
}

/* Focus trap for modals */
.focus-trap {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

/* Ensure interactive elements are large enough */
@media (max-width: 768px) {
    button, a, input, select, textarea {
        min-height: 44px;
        min-width: 44px;
    }
}
`