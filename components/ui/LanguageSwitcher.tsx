'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supportedLanguages } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  className?: string
  variant?: 'dropdown' | 'inline'
  showNativeName?: boolean
}

export default function LanguageSwitcher({
  className = '',
  variant = 'dropdown',
  showNativeName = true
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState(i18n.language)

  useEffect(() => {
    setCurrentLang(i18n.language)
  }, [i18n.language])

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
    setCurrentLang(langCode)
    setIsOpen(false)
    
    // Save to localStorage
    localStorage.setItem('gone-rubeen-lang', langCode)
  }

  const currentLanguage = supportedLanguages.find(lang => lang.code === currentLang) || supportedLanguages[0]

  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {supportedLanguages.map(lang => (
          <Button
            key={lang.code}
            variant={currentLang === lang.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLanguageChange(lang.code)}
            className="gap-2"
          >
            {lang.code === currentLang && <Check className="h-3 w-3" />}
            {showNativeName ? lang.nativeName : lang.code.toUpperCase()}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Globe className="h-4 w-4" />
        <span>{showNativeName ? currentLanguage.nativeName : currentLanguage.code.toUpperCase()}</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
            <div className="py-1">
              {supportedLanguages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={cn(
                    "w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between",
                    currentLang === lang.code && "bg-blue-50 text-blue-600"
                  )}
                >
                  <div>
                    <div className="font-medium">
                      {lang.nativeName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {lang.name}
                    </div>
                  </div>
                  {currentLang === lang.code && (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}