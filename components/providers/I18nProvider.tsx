'use client'

import { useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'

export default function I18nProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Ensure i18n is initialized
    if (!i18n.isInitialized) {
      i18n.init().then(() => {
        setIsInitialized(true)
      })
    } else {
      setIsInitialized(true)
    }
  }, [])

  if (!isInitialized) {
    return <div>Loading translations...</div>
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  )
}