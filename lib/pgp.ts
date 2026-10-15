'use client'

import { setupCryptoPolyfill } from './crypto-polyfill'
import { encryptWithFallback, decryptWithFallback, isFallbackEncrypted } from './crypto-fallback'

// Dynamic import to avoid SSR issues
let openpgp: any = null;

async function getOpenPGP() {
  if (!openpgp && typeof window !== 'undefined') {
    // Setup crypto polyfill before loading OpenPGP
    setupCryptoPolyfill();
    
    try {
      openpgp = await import('openpgp');
      
      // Configure OpenPGP for better compatibility
      if (openpgp.config) {
        // Disable compression for better compatibility
        openpgp.config.preferredCompressionAlgorithm = openpgp.enums.compression.uncompressed;
        // Allow more flexible decryption
        openpgp.config.allowInsecureDecryptionWithSigningKeys = true;
        // Only use WebCrypto if it's properly available
        openpgp.config.useWebCrypto = !!(window.crypto?.subtle?.encrypt);
        // Use lower security settings for better compatibility
        openpgp.config.aeadProtect = false;
        openpgp.config.preferredHashAlgorithm = openpgp.enums.hash.sha256;
      }
    } catch (error) {
      console.error('Failed to load OpenPGP:', error);
      throw new Error('OpenPGP initialization failed. Please ensure your browser supports WebCrypto API or try a different browser.');
    }
  }
  return openpgp;
}

export async function encryptData(data: string, passphrase: string) {
  try {
    const pgp = await getOpenPGP();
    if (!pgp) {
      // Fallback to Node crypto if OpenPGP is not available
      console.warn('OpenPGP not available, using fallback encryption');
      return encryptWithFallback(data, passphrase);
    }
    
    const encrypted = await pgp.encrypt({
      message: await pgp.createMessage({ text: data }),
      passwords: [passphrase],
      format: 'armored',
    });
    return encrypted;
  } catch (error) {
    console.error('OpenPGP encryption error:', error);
    
    // Try fallback encryption
    try {
      console.warn('Falling back to alternative encryption method');
      return encryptWithFallback(data, passphrase);
    } catch (fallbackError) {
      console.error('Fallback encryption also failed:', fallbackError);
      throw new Error('Encryption failed. Please ensure your browser supports modern cryptography features.');
    }
  }
}

export async function decryptData(encryptedData: string, passphrase: string) {
  // Check if data was encrypted with fallback method
  if (isFallbackEncrypted(encryptedData)) {
    return decryptWithFallback(encryptedData, passphrase);
  }
  
  try {
    const pgp = await getOpenPGP();
    if (!pgp) {
      // Try fallback decryption
      console.warn('OpenPGP not available, trying fallback decryption');
      return decryptWithFallback(encryptedData, passphrase);
    }
    
    const message = await pgp.readMessage({
      armoredMessage: encryptedData,
    });
    const { data: decrypted } = await pgp.decrypt({
      message,
      passwords: [passphrase],
    });
    return decrypted;
  } catch (error) {
    console.error('OpenPGP decryption error:', error);
    
    // Try fallback decryption
    try {
      console.warn('Trying fallback decryption method');
      return decryptWithFallback(encryptedData, passphrase);
    } catch (fallbackError) {
      console.error('Fallback decryption also failed:', fallbackError);
      throw new Error('Decryption failed. Please check your passphrase.');
    }
  }
}
