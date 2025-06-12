'use client'

import { useState, useCallback } from 'react'
import { EmergencyContact, ContactGroup, EmergencyAccessToken } from '@/services/emergency-access-service'

export interface UseEmergencyAccessReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Contact operations
  getContacts: () => Promise<EmergencyContact[]>;
  getContact: (contactId: string) => Promise<EmergencyContact | null>;
  saveContact: (contact: Partial<EmergencyContact>) => Promise<EmergencyContact | null>;
  updateContact: (contactId: string, updates: Partial<EmergencyContact>) => Promise<EmergencyContact | null>;
  deleteContact: (contactId: string) => Promise<boolean>;
  
  // Group operations
  getGroups: () => Promise<ContactGroup[]>;
  saveGroup: (group: Partial<ContactGroup>) => Promise<ContactGroup | null>;
  
  // Token operations
  generateToken: (options: {
    contactId: string;
    fileIds?: string[];
    accessLevel?: 'view' | 'download' | 'full';
    tokenType?: 'temporary' | 'long-term' | 'permanent';
    expirationHours?: number;
    maxUses?: number;
    refreshable?: boolean;
    ipRestrictions?: string[];
    metadata?: Record<string, any>;
  }) => Promise<{
    token: string;
    url: string;
    tokenData: EmergencyAccessToken;
  } | null>;
  validateToken: (token: string) => Promise<any>;
  revokeToken: (tokenId: string, reason?: string) => Promise<boolean>;
  refreshToken: (tokenId: string, extensionHours?: number) => Promise<{
    token: string;
    url: string;
    tokenData: EmergencyAccessToken;
  } | null>;
  activateToken: (tokenId: string) => Promise<boolean>;
  getContactTokens: (contactId: string) => Promise<EmergencyAccessToken[]>;
  
  // Access logs
  getAccessLogs: (options?: {
    tokenId?: string;
    contactId?: string;
    action?: string;
    limit?: number;
  }) => Promise<any[]>;
  
  // Utility
  clearError: () => void;
}

export function useEmergencyAccess(): UseEmergencyAccessReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const getContacts = useCallback(async (): Promise<EmergencyContact[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/emergency/contacts');
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.contacts;
      } else {
        handleError(new Error(result.error), 'Failed to get contacts');
        return [];
      }
    } catch (error) {
      handleError(error, 'Failed to get contacts');
      return [];
    }
  }, [handleError]);

  const getContact = useCallback(async (contactId: string): Promise<EmergencyContact | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/emergency/contacts/${contactId}`);
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.contact;
      } else {
        handleError(new Error(result.error), 'Failed to get contact');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to get contact');
      return null;
    }
  }, [handleError]);

  const saveContact = useCallback(async (contact: Partial<EmergencyContact>): Promise<EmergencyContact | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/emergency/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contact),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.contact;
      } else {
        handleError(new Error(result.error), 'Failed to save contact');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to save contact');
      return null;
    }
  }, [handleError]);

  const updateContact = useCallback(async (
    contactId: string, 
    updates: Partial<EmergencyContact>
  ): Promise<EmergencyContact | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/emergency/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.contact;
      } else {
        handleError(new Error(result.error), 'Failed to update contact');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to update contact');
      return null;
    }
  }, [handleError]);

  const deleteContact = useCallback(async (contactId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/emergency/contacts/${contactId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return true;
      } else {
        handleError(new Error(result.error), 'Failed to delete contact');
        return false;
      }
    } catch (error) {
      handleError(error, 'Failed to delete contact');
      return false;
    }
  }, [handleError]);

  const getGroups = useCallback(async (): Promise<ContactGroup[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/emergency/groups');
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.groups;
      } else {
        handleError(new Error(result.error), 'Failed to get groups');
        return [];
      }
    } catch (error) {
      handleError(error, 'Failed to get groups');
      return [];
    }
  }, [handleError]);

  const saveGroup = useCallback(async (group: Partial<ContactGroup>): Promise<ContactGroup | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/emergency/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(group),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.group;
      } else {
        handleError(new Error(result.error), 'Failed to save group');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to save group');
      return null;
    }
  }, [handleError]);

  const generateToken = useCallback(async (options: {
    contactId: string;
    fileIds?: string[];
    accessLevel?: 'view' | 'download' | 'full';
    tokenType?: 'temporary' | 'long-term' | 'permanent';
    expirationHours?: number;
    maxUses?: number;
    refreshable?: boolean;
    ipRestrictions?: string[];
    metadata?: Record<string, any>;
  }): Promise<{
    token: string;
    url: string;
    tokenData: EmergencyAccessToken;
  } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/emergency/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return {
          token: result.token,
          url: result.url,
          tokenData: result.tokenData
        };
      } else {
        handleError(new Error(result.error), 'Failed to generate token');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to generate token');
      return null;
    }
  }, [handleError]);

  const validateToken = useCallback(async (token: string): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/emergency/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      setIsLoading(false);
      return result;
    } catch (error) {
      handleError(error, 'Failed to validate token');
      return null;
    }
  }, [handleError]);

  const revokeToken = useCallback(async (tokenId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/emergency/revoke-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenId, reason }),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return true;
      } else {
        handleError(new Error(result.error), 'Failed to revoke token');
        return false;
      }
    } catch (error) {
      handleError(error, 'Failed to revoke token');
      return false;
    }
  }, [handleError]);

  const refreshToken = useCallback(async (tokenId: string, extensionHours?: number): Promise<{
    token: string;
    url: string;
    tokenData: EmergencyAccessToken;
  } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/emergency/tokens/${tokenId}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ extensionHours }),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return {
          token: result.token,
          url: result.url,
          tokenData: result.tokenData
        };
      } else {
        handleError(new Error(result.error), 'Failed to refresh token');
        return null;
      }
    } catch (error) {
      handleError(error, 'Failed to refresh token');
      return null;
    }
  }, [handleError]);

  const activateToken = useCallback(async (tokenId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/emergency/tokens/${tokenId}/activate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return true;
      } else {
        handleError(new Error(result.error), 'Failed to activate token');
        return false;
      }
    } catch (error) {
      handleError(error, 'Failed to activate token');
      return false;
    }
  }, [handleError]);

  const getContactTokens = useCallback(async (contactId: string): Promise<EmergencyAccessToken[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/emergency/contact-tokens/${contactId}`);
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.tokens;
      } else {
        handleError(new Error(result.error), 'Failed to get contact tokens');
        return [];
      }
    } catch (error) {
      handleError(error, 'Failed to get contact tokens');
      return [];
    }
  }, [handleError]);

  const getAccessLogs = useCallback(async (options: {
    tokenId?: string;
    contactId?: string;
    action?: string;
    limit?: number;
  } = {}): Promise<any[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      
      if (options.tokenId) searchParams.set('tokenId', options.tokenId);
      if (options.contactId) searchParams.set('contactId', options.contactId);
      if (options.action) searchParams.set('action', options.action);
      if (options.limit) searchParams.set('limit', options.limit.toString());

      const response = await fetch(`/api/emergency/access-logs?${searchParams}`);
      const result = await response.json();

      if (result.success) {
        setIsLoading(false);
        return result.logs;
      } else {
        handleError(new Error(result.error), 'Failed to get access logs');
        return [];
      }
    } catch (error) {
      handleError(error, 'Failed to get access logs');
      return [];
    }
  }, [handleError]);

  return {
    isLoading,
    error,
    getContacts,
    getContact,
    saveContact,
    updateContact,
    deleteContact,
    getGroups,
    saveGroup,
    generateToken,
    validateToken,
    revokeToken,
    refreshToken,
    activateToken,
    getContactTokens,
    getAccessLogs,
    clearError
  };
}