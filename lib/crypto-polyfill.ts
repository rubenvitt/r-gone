'use client'

// WebCrypto Polyfill for environments where it's not available
export function setupCryptoPolyfill() {
  if (typeof window !== 'undefined') {
    // Check if WebCrypto is already available
    if (window.crypto && window.crypto.subtle) {
      return; // Already available
    }

    // Try to use Node crypto if available (in Electron or similar environments)
    try {
      const nodeCrypto = require('crypto');
      
      if (!window.crypto) {
        window.crypto = {} as any;
      }
      
      // Create a minimal webcrypto-compatible object
      if (!window.crypto.subtle) {
        // This is a simplified polyfill - OpenPGP will handle the actual crypto
        window.crypto.subtle = {
          generateKey: () => Promise.reject(new Error('Not implemented')),
          importKey: () => Promise.reject(new Error('Not implemented')),
          exportKey: () => Promise.reject(new Error('Not implemented')),
          encrypt: () => Promise.reject(new Error('Not implemented')),
          decrypt: () => Promise.reject(new Error('Not implemented')),
          sign: () => Promise.reject(new Error('Not implemented')),
          verify: () => Promise.reject(new Error('Not implemented')),
          digest: async (algorithm: string, data: ArrayBuffer) => {
            // Basic digest implementation using Node crypto
            const hash = nodeCrypto.createHash(algorithm.toLowerCase().replace('-', ''));
            hash.update(Buffer.from(data));
            return hash.digest();
          }
        } as any;
      }
      
      // Ensure getRandomValues is available
      if (!window.crypto.getRandomValues) {
        window.crypto.getRandomValues = function(array: any) {
          const bytes = nodeCrypto.randomBytes(array.length);
          for (let i = 0; i < array.length; i++) {
            array[i] = bytes[i];
          }
          return array;
        };
      }
    } catch (e) {
      // If we can't load Node crypto, create a basic fallback
      if (!window.crypto) {
        window.crypto = {} as any;
      }
      
      // Minimal implementation for OpenPGP
      if (!window.crypto.getRandomValues) {
        window.crypto.getRandomValues = function(array: any) {
          // Fallback to Math.random (not cryptographically secure!)
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
          }
          return array;
        };
      }
    }
  }
}