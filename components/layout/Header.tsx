'use client'

import { useTranslation } from 'react-i18next'
import { Menu, X, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { useState } from 'react'

interface HeaderProps {
  className?: string
}

export default function Header({ className = '' }: HeaderProps) {
  const { t } = useTranslation('common')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">
              {t('app.title')}
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
              {t('navigation.dashboard')}
            </a>
            <a href="/messages" className="text-gray-700 hover:text-blue-600 font-medium">
              {t('navigation.messages')}
            </a>
            <a href="/beneficiaries" className="text-gray-700 hover:text-blue-600 font-medium">
              {t('navigation.beneficiaries')}
            </a>
            <a href="/documents" className="text-gray-700 hover:text-blue-600 font-medium">
              {t('navigation.documents')}
            </a>
            <a href="/settings" className="text-gray-700 hover:text-blue-600 font-medium">
              {t('navigation.settings')}
            </a>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 space-y-2">
            <a href="/dashboard" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              {t('navigation.dashboard')}
            </a>
            <a href="/messages" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              {t('navigation.messages')}
            </a>
            <a href="/beneficiaries" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              {t('navigation.beneficiaries')}
            </a>
            <a href="/documents" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              {t('navigation.documents')}
            </a>
            <a href="/settings" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              {t('navigation.settings')}
            </a>
          </nav>
        )}
      </div>
    </header>
  )
}