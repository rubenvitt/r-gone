'use client'

import { useState } from 'react'
import MessagesLibrary from './MessagesLibrary'
import { MessagesLibrary as MessagesLibraryType } from '@/types/data'
import { messagesLibraryService } from '@/services/messages-library-service'

interface MessagesLibraryWrapperProps {
  beneficiaries?: any[]
  contacts?: any[]
}

export default function MessagesLibraryWrapper({
  beneficiaries = [],
  contacts = []
}: MessagesLibraryWrapperProps) {
  const [library, setLibrary] = useState<MessagesLibraryType>(() => 
    messagesLibraryService.createEmptyLibrary()
  )

  return (
    <MessagesLibrary
      library={library}
      onLibraryChange={setLibrary}
      beneficiaries={beneficiaries}
      contacts={contacts}
    />
  )
}