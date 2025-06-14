'use client'

// Client-side messages library service
import { MessagesLibrary, PersonalMessage } from '@/types/data'
import { messagesLibraryService } from './messages-library-service'

class MessagesLibraryClient {
  private static instance: MessagesLibraryClient
  private library: MessagesLibrary | null = null

  public static getInstance(): MessagesLibraryClient {
    if (!MessagesLibraryClient.instance) {
      MessagesLibraryClient.instance = new MessagesLibraryClient()
    }
    return MessagesLibraryClient.instance
  }

  /**
   * Initialize or get the library
   */
  private getLibrary(): MessagesLibrary {
    if (!this.library) {
      this.library = messagesLibraryService.createEmptyLibrary()
    }
    return this.library
  }

  /**
   * List all messages
   */
  async listMessages(): Promise<PersonalMessage[]> {
    try {
      // For now, return messages from the local library
      // In a real implementation, this would fetch from an API
      const library = this.getLibrary()
      return library.messages
    } catch (error) {
      console.error('Failed to list messages:', error)
      return []
    }
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    const messages = await this.listMessages()
    return messages.length
  }

  /**
   * Create a new message
   */
  async createMessage(message: Partial<PersonalMessage>): Promise<PersonalMessage> {
    // In a real implementation, this would call an API
    const library = this.getLibrary()
    const newMessage: PersonalMessage = {
      id: crypto.randomUUID(),
      title: message.title || '',
      type: message.type || 'general',
      format: message.format || 'text',
      category: message.category || 'immediate',
      content: message.content || { text: '' },
      recipients: message.recipients || [],
      status: 'draft',
      metadata: {
        importance: 'medium',
        sensitivity: 'private',
        language: 'en',
        ...message.metadata
      },
      conditions: message.conditions || [],
      scheduling: message.scheduling || {},
      attachments: message.attachments || [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      locale: 'en'
    }

    this.library!.messages.push(newMessage)
    return newMessage
  }
}

export const messagesLibraryClient = MessagesLibraryClient.getInstance()