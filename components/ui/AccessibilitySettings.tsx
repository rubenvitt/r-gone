'use client'

import { useAccessibility } from '@/components/ui/AccessibilityProvider'
import { Button } from '@/components/ui/button'
import { 
    Eye, 
    Type, 
    Volume2, 
    Keyboard, 
    MousePointer, 
    Palette,
    Settings,
    CheckCircle,
    X
} from 'lucide-react'

interface AccessibilitySettingsProps {
    onClose?: () => void
    className?: string
}

export default function AccessibilitySettings({
    onClose,
    className = ''
}: AccessibilitySettingsProps) {
    const { state, updatePreference, announceToScreenReader } = useAccessibility()

    const handleToggle = (key: keyof typeof state, value: any, announcement: string) => {
        updatePreference(key, value)
        announceToScreenReader(announcement)
    }

    return (
        <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Settings className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Accessibility Settings
                        </h3>
                    </div>
                    {onClose && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={onClose}
                            aria-label="Close accessibility settings"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                    Customize your experience for better accessibility
                </p>
            </div>

            {/* Settings Content */}
            <div className="p-4 space-y-6">
                {/* Visual Preferences */}
                <section aria-labelledby="visual-heading">
                    <h4 id="visual-heading" className="font-medium text-gray-900 mb-3 flex items-center">
                        <Eye className="h-4 w-4 mr-2" />
                        Visual Preferences
                    </h4>
                    
                    <div className="space-y-3">
                        {/* High Contrast */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label 
                                    htmlFor="high-contrast" 
                                    className="text-sm font-medium text-gray-700"
                                >
                                    High Contrast
                                </label>
                                <p className="text-xs text-gray-500">
                                    Increase contrast for better visibility
                                </p>
                            </div>
                            <button
                                id="high-contrast"
                                role="switch"
                                aria-checked={state.highContrast}
                                onClick={() => handleToggle(
                                    'highContrast', 
                                    !state.highContrast,
                                    `High contrast ${!state.highContrast ? 'enabled' : 'disabled'}`
                                )}
                                className={`
                                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                    ${state.highContrast ? 'bg-blue-600' : 'bg-gray-200'}
                                `}
                            >
                                <span
                                    className={`
                                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                        ${state.highContrast ? 'translate-x-6' : 'translate-x-1'}
                                    `}
                                />
                                <span className="sr-only">
                                    {state.highContrast ? 'Disable' : 'Enable'} high contrast
                                </span>
                            </button>
                        </div>

                        {/* Reduce Motion */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label 
                                    htmlFor="reduce-motion" 
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Reduce Motion
                                </label>
                                <p className="text-xs text-gray-500">
                                    Minimize animations and transitions
                                </p>
                            </div>
                            <button
                                id="reduce-motion"
                                role="switch"
                                aria-checked={state.reduceMotion}
                                onClick={() => handleToggle(
                                    'reduceMotion', 
                                    !state.reduceMotion,
                                    `Motion reduction ${!state.reduceMotion ? 'enabled' : 'disabled'}`
                                )}
                                className={`
                                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                    ${state.reduceMotion ? 'bg-blue-600' : 'bg-gray-200'}
                                `}
                            >
                                <span
                                    className={`
                                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                        ${state.reduceMotion ? 'translate-x-6' : 'translate-x-1'}
                                    `}
                                />
                                <span className="sr-only">
                                    {state.reduceMotion ? 'Disable' : 'Enable'} reduced motion
                                </span>
                            </button>
                        </div>

                        {/* Font Size */}
                        <div>
                            <label 
                                htmlFor="font-size" 
                                className="text-sm font-medium text-gray-700 block mb-2"
                            >
                                Font Size
                            </label>
                            <div className="flex space-x-2">
                                {(['small', 'medium', 'large'] as const).map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => handleToggle(
                                            'fontSize', 
                                            size,
                                            `Font size changed to ${size}`
                                        )}
                                        className={`
                                            px-3 py-2 text-xs rounded border flex items-center space-x-1
                                            ${state.fontSize === size 
                                                ? 'bg-blue-100 border-blue-300 text-blue-700' 
                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }
                                        `}
                                        aria-pressed={state.fontSize === size}
                                    >
                                        <Type className="h-3 w-3" />
                                        <span className="capitalize">{size}</span>
                                        {state.fontSize === size && (
                                            <CheckCircle className="h-3 w-3" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Navigation Preferences */}
                <section aria-labelledby="navigation-heading">
                    <h4 id="navigation-heading" className="font-medium text-gray-900 mb-3 flex items-center">
                        <Keyboard className="h-4 w-4 mr-2" />
                        Navigation Preferences
                    </h4>
                    
                    <div className="space-y-3">
                        {/* Keyboard Navigation */}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium text-gray-700">
                                    Keyboard Navigation
                                </span>
                                <p className="text-xs text-gray-500">
                                    {state.keyboardNavigation ? 'Active' : 'Use Tab key to activate'}
                                </p>
                            </div>
                            <div className={`
                                flex items-center space-x-1 px-2 py-1 rounded text-xs
                                ${state.keyboardNavigation 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-600'
                                }
                            `}>
                                {state.keyboardNavigation ? (
                                    <>
                                        <CheckCircle className="h-3 w-3" />
                                        <span>Active</span>
                                    </>
                                ) : (
                                    <>
                                        <Keyboard className="h-3 w-3" />
                                        <span>Inactive</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Screen Reader */}
                <section aria-labelledby="screenreader-heading">
                    <h4 id="screenreader-heading" className="font-medium text-gray-900 mb-3 flex items-center">
                        <Volume2 className="h-4 w-4 mr-2" />
                        Screen Reader
                    </h4>
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium text-gray-700">
                                    Screen Reader Detection
                                </span>
                                <p className="text-xs text-gray-500">
                                    {state.screenReader 
                                        ? 'Screen reader detected' 
                                        : 'No screen reader detected'
                                    }
                                </p>
                            </div>
                            <div className={`
                                flex items-center space-x-1 px-2 py-1 rounded text-xs
                                ${state.screenReader 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-gray-100 text-gray-600'
                                }
                            `}>
                                <Volume2 className="h-3 w-3" />
                                <span>{state.screenReader ? 'Detected' : 'Not detected'}</span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => announceToScreenReader(
                                'This is a test announcement for screen readers. All features are working correctly.'
                            )}
                            className="w-full"
                        >
                            <Volume2 className="h-4 w-4 mr-2" />
                            Test Screen Reader Announcement
                        </Button>
                    </div>
                </section>

                {/* Help Section */}
                <section aria-labelledby="help-heading" className="border-t border-gray-200 pt-4">
                    <h4 id="help-heading" className="font-medium text-gray-900 mb-3">
                        Accessibility Information
                    </h4>
                    
                    <div className="text-xs text-gray-600 space-y-2">
                        <p>
                            <strong>Keyboard Shortcuts:</strong> Tab to navigate, Enter to activate, 
                            Escape to close dialogs
                        </p>
                        <p>
                            <strong>Screen Readers:</strong> NVDA, JAWS, and VoiceOver are supported
                        </p>
                        <p>
                            <strong>WCAG Compliance:</strong> This interface follows WCAG 2.1 AA guidelines
                        </p>
                    </div>
                </section>
            </div>
        </div>
    )
}