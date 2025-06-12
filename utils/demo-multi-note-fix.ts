/**
 * Demo to verify multi-note JSON loading fix
 */

import { encryptionService } from '@/services/encryption-service'
import { DecryptedData, EnhancedDecryptedData } from '@/types/data'
import { createEnhancedData } from '@/utils/multi-note-utils'

// Test data that simulates what would be stored after encryption
const testMultiNoteData: EnhancedDecryptedData = {
  notes: [
    {
      id: 'note-1',
      title: 'Important Passwords',
      content: '<p>My bank password is: <strong>secret123</strong></p>',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      metadata: { wordCount: 5, characterCount: 45 }
    },
    {
      id: 'note-2', 
      title: 'Emergency Contacts',
      content: '<p>Doctor: <em>Dr. Smith 555-1234</em></p><p>Lawyer: <em>John Doe 555-5678</em></p>',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      metadata: { wordCount: 8, characterCount: 75 }
    }
  ],
  metadata: {
    lastModified: '2024-01-01T00:00:00Z',
    version: '1.0',
    dataFormat: 'multi-note',
    activeNoteId: 'note-1'
  },
  versionHistory: [],
  settings: {
    autoSave: { enabled: true, intervalMs: 30000 },
    defaultNoteTitle: 'New Note',
    maxNotesPerFile: 100
  }
}

// Test legacy data format
const testLegacyData: DecryptedData = {
  sections: [
    {
      id: 'section-1',
      title: 'Emergency Info',
      content: ['<p>This is legacy <strong>emergency</strong> information.</p>']
    }
  ],
  metadata: {
    lastModified: '2024-01-01T00:00:00Z',
    version: '1.0',
    dataFormat: 'legacy'
  }
}

export function testExtractRichTextContent() {
  console.log('=== Testing extractRichTextContent Fix ===')
  
  // Test 1: Multi-note format
  console.log('\n1. Testing multi-note format:')
  const multiNoteResult = encryptionService.extractRichTextContent(testMultiNoteData)
  console.log('Expected: <p>My bank password is: <strong>secret123</strong></p>')
  console.log('Actual:', multiNoteResult)
  console.log('✓ Success:', multiNoteResult === '<p>My bank password is: <strong>secret123</strong></p>')
  
  // Test 2: Legacy format
  console.log('\n2. Testing legacy format:')
  const legacyResult = encryptionService.extractRichTextContent(testLegacyData)
  console.log('Expected: <p>This is legacy <strong>emergency</strong> information.</p>')
  console.log('Actual:', legacyResult)
  console.log('✓ Success:', legacyResult === '<p>This is legacy <strong>emergency</strong> information.</p>')
  
  // Test 3: JSON string format (what comes from decryption)
  console.log('\n3. Testing JSON string format:')
  const jsonString = JSON.stringify(testMultiNoteData)
  const jsonResult = encryptionService.extractRichTextContent(jsonString)
  console.log('Expected: <p>My bank password is: <strong>secret123</strong></p>')
  console.log('Actual:', jsonResult)
  console.log('✓ Success:', jsonResult === '<p>My bank password is: <strong>secret123</strong></p>')
  
  // Test 4: Plain text (legacy fallback)
  console.log('\n4. Testing plain text fallback:')
  const plainText = '<p>Just some plain HTML content</p>'
  const plainResult = encryptionService.extractRichTextContent(plainText)
  console.log('Expected: <p>Just some plain HTML content</p>')
  console.log('Actual:', plainResult)
  console.log('✓ Success:', plainResult === '<p>Just some plain HTML content</p>')
  
  // Test 5: Empty notes
  console.log('\n5. Testing empty notes:')
  const emptyData: DecryptedData = {
    notes: [],
    metadata: {
      lastModified: '2024-01-01T00:00:00Z',
      version: '1.0',
      dataFormat: 'multi-note'
    }
  }
  const emptyResult = encryptionService.extractRichTextContent(emptyData)
  console.log('Expected: ""')
  console.log('Actual:', emptyResult)
  console.log('✓ Success:', emptyResult === '')
  
  console.log('\n=== Test Complete ===')
}

export function simulateEncryptionDecryptionFlow() {
  console.log('\n=== Simulating Full Encryption/Decryption Flow ===')
  
  // This simulates what happens when:
  // 1. User creates multi-note content
  // 2. System encrypts it as JSON string
  // 3. System decrypts it and gets JSON string back
  // 4. extractRichTextContent should handle this properly
  
  const originalData = testMultiNoteData
  console.log('1. Original data has', originalData.notes?.length, 'notes')
  
  // Simulate encryption (converts to JSON string)
  const serializedData = JSON.stringify(originalData)
  console.log('2. Serialized data length:', serializedData.length, 'characters')
  
  // Simulate decryption (gets JSON string back)
  // This is what extractRichTextContent receives from the decryption service
  const extractedContent = encryptionService.extractRichTextContent(serializedData)
  console.log('3. Extracted content:', extractedContent)
  console.log('4. Should not be raw JSON - Success:', !extractedContent.includes('"notes"'))
  
  console.log('\n=== Flow Simulation Complete ===')
}

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  console.log('🧪 Running multi-note fix verification...')
  testExtractRichTextContent()
  simulateEncryptionDecryptionFlow()
}