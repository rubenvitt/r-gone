import { encryptionService } from '@/services/encryption-service'
import { EncryptionValidator } from '@/utils/encryption-utils'

export interface TestResult {
  testName: string
  passed: boolean
  error?: string
  duration?: number
}

export class EncryptionTester {
  /**
   * Runs a comprehensive test suite for encryption functionality
   */
  static async runTestSuite(): Promise<TestResult[]> {
    const results: TestResult[] = []

    // Test 1: Basic encryption/decryption
    results.push(await this.testBasicEncryptionDecryption())

    // Test 2: Passphrase validation
    results.push(await this.testPassphraseValidation())

    // Test 3: Large content handling
    results.push(await this.testLargeContent())

    // Test 4: Special characters
    results.push(await this.testSpecialCharacters())

    // Test 5: Empty content handling
    results.push(await this.testEmptyContent())

    // Test 6: Invalid passphrase
    results.push(await this.testInvalidPassphrase())

    // Test 7: Data integrity
    results.push(await this.testDataIntegrity())

    return results
  }

  private static async testBasicEncryptionDecryption(): Promise<TestResult> {
    const start = Date.now()
    try {
      const testContent = 'This is a test message with <b>HTML</b> content.'
      const testPassphrase = 'TestPassphrase123!'

      // Encrypt
      const encryptResult = await encryptionService.encryptContent(testContent, testPassphrase)
      if (!encryptResult.success || !encryptResult.encryptedData) {
        return {
          testName: 'Basic Encryption/Decryption',
          passed: false,
          error: 'Encryption failed',
          duration: Date.now() - start
        }
      }

      // Decrypt
      const decryptResult = await encryptionService.decryptContent(encryptResult.encryptedData, testPassphrase)
      if (!decryptResult.success || !decryptResult.decryptedData) {
        return {
          testName: 'Basic Encryption/Decryption',
          passed: false,
          error: 'Decryption failed',
          duration: Date.now() - start
        }
      }

      // Verify content
      const extractedContent = encryptionService.extractRichTextContent(decryptResult.decryptedData)
      if (extractedContent !== testContent) {
        return {
          testName: 'Basic Encryption/Decryption',
          passed: false,
          error: 'Content mismatch after round-trip',
          duration: Date.now() - start
        }
      }

      return {
        testName: 'Basic Encryption/Decryption',
        passed: true,
        duration: Date.now() - start
      }
    } catch (error) {
      return {
        testName: 'Basic Encryption/Decryption',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start
      }
    }
  }

  private static async testPassphraseValidation(): Promise<TestResult> {
    const start = Date.now()
    try {
      // Test weak passphrase
      const weakValidation = encryptionService.validatePassphrase('123')
      if (weakValidation.isValid) {
        return {
          testName: 'Passphrase Validation',
          passed: false,
          error: 'Weak passphrase incorrectly validated as strong',
          duration: Date.now() - start
        }
      }

      // Test strong passphrase
      const strongValidation = encryptionService.validatePassphrase('StrongPass123!')
      if (!strongValidation.isValid) {
        return {
          testName: 'Passphrase Validation',
          passed: false,
          error: 'Strong passphrase incorrectly rejected',
          duration: Date.now() - start
        }
      }

      return {
        testName: 'Passphrase Validation',
        passed: true,
        duration: Date.now() - start
      }
    } catch (error) {
      return {
        testName: 'Passphrase Validation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start
      }
    }
  }

  private static async testLargeContent(): Promise<TestResult> {
    const start = Date.now()
    try {
      // Generate large content (about 5KB)
      const largeContent = 'A'.repeat(5000)
      const testPassphrase = 'TestPassphrase123!'

      const encryptResult = await encryptionService.encryptContent(largeContent, testPassphrase)
      if (!encryptResult.success) {
        return {
          testName: 'Large Content Handling',
          passed: false,
          error: 'Failed to encrypt large content',
          duration: Date.now() - start
        }
      }

      const decryptResult = await encryptionService.decryptContent(encryptResult.encryptedData!, testPassphrase)
      if (!decryptResult.success) {
        return {
          testName: 'Large Content Handling',
          passed: false,
          error: 'Failed to decrypt large content',
          duration: Date.now() - start
        }
      }

      const extractedContent = encryptionService.extractRichTextContent(decryptResult.decryptedData!)
      if (extractedContent.length !== largeContent.length) {
        return {
          testName: 'Large Content Handling',
          passed: false,
          error: 'Content length mismatch for large content',
          duration: Date.now() - start
        }
      }

      return {
        testName: 'Large Content Handling',
        passed: true,
        duration: Date.now() - start
      }
    } catch (error) {
      return {
        testName: 'Large Content Handling',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start
      }
    }
  }

  private static async testSpecialCharacters(): Promise<TestResult> {
    const start = Date.now()
    try {
      const specialContent = '🔒 Special chars: äöü ñ © ® ™ 中文 العربية 🚀'
      const testPassphrase = 'TestPassphrase123!'

      const encryptResult = await encryptionService.encryptContent(specialContent, testPassphrase)
      if (!encryptResult.success) {
        return {
          testName: 'Special Characters',
          passed: false,
          error: 'Failed to encrypt special characters',
          duration: Date.now() - start
        }
      }

      const decryptResult = await encryptionService.decryptContent(encryptResult.encryptedData!, testPassphrase)
      if (!decryptResult.success) {
        return {
          testName: 'Special Characters',
          passed: false,
          error: 'Failed to decrypt special characters',
          duration: Date.now() - start
        }
      }

      const extractedContent = encryptionService.extractRichTextContent(decryptResult.decryptedData!)
      if (extractedContent !== specialContent) {
        return {
          testName: 'Special Characters',
          passed: false,
          error: 'Special characters corrupted during encryption/decryption',
          duration: Date.now() - start
        }
      }

      return {
        testName: 'Special Characters',
        passed: true,
        duration: Date.now() - start
      }
    } catch (error) {
      return {
        testName: 'Special Characters',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start
      }
    }
  }

  private static async testEmptyContent(): Promise<TestResult> {
    const start = Date.now()
    try {
      const emptyContent = ''
      const testPassphrase = 'TestPassphrase123!'

      const encryptResult = await encryptionService.encryptContent(emptyContent, testPassphrase)
      if (encryptResult.success) {
        return {
          testName: 'Empty Content Handling',
          passed: false,
          error: 'Empty content should not be allowed for encryption',
          duration: Date.now() - start
        }
      }

      return {
        testName: 'Empty Content Handling',
        passed: true,
        duration: Date.now() - start
      }
    } catch (error) {
      return {
        testName: 'Empty Content Handling',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start
      }
    }
  }

  private static async testInvalidPassphrase(): Promise<TestResult> {
    const start = Date.now()
    try {
      const testContent = 'Test content'
      const correctPassphrase = 'CorrectPassword123!'
      const wrongPassphrase = 'WrongPassword123!'

      // Encrypt with correct passphrase
      const encryptResult = await encryptionService.encryptContent(testContent, correctPassphrase)
      if (!encryptResult.success) {
        return {
          testName: 'Invalid Passphrase Handling',
          passed: false,
          error: 'Initial encryption failed',
          duration: Date.now() - start
        }
      }

      // Try to decrypt with wrong passphrase
      const decryptResult = await encryptionService.decryptContent(encryptResult.encryptedData!, wrongPassphrase)
      if (decryptResult.success) {
        return {
          testName: 'Invalid Passphrase Handling',
          passed: false,
          error: 'Decryption succeeded with wrong passphrase',
          duration: Date.now() - start
        }
      }

      return {
        testName: 'Invalid Passphrase Handling',
        passed: true,
        duration: Date.now() - start
      }
    } catch (error) {
      return {
        testName: 'Invalid Passphrase Handling',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start
      }
    }
  }

  private static async testDataIntegrity(): Promise<TestResult> {
    const start = Date.now()
    try {
      const testContent = 'Data integrity test content'
      const testPassphrase = 'TestPassphrase123!'

      // Encrypt
      const encryptResult = await encryptionService.encryptContent(testContent, testPassphrase)
      if (!encryptResult.success || !encryptResult.encryptedData) {
        return {
          testName: 'Data Integrity Validation',
          passed: false,
          error: 'Encryption failed',
          duration: Date.now() - start
        }
      }

      // Validate encrypted data format
      const validation = EncryptionValidator.validateEncryptedData(encryptResult.encryptedData)
      if (!validation.isValid) {
        return {
          testName: 'Data Integrity Validation',
          passed: false,
          error: `Encrypted data validation failed: ${validation.errors.join(', ')}`,
          duration: Date.now() - start
        }
      }

      // Test corrupted data detection
      const corruptedData = encryptResult.encryptedData.replace(/[A-Z]/g, 'X')
      const corruptedValidation = EncryptionValidator.validateEncryptedData(corruptedData)
      
      // This should still pass format validation but fail decryption
      const decryptCorrupted = await encryptionService.decryptContent(corruptedData, testPassphrase)
      if (decryptCorrupted.success) {
        return {
          testName: 'Data Integrity Validation',
          passed: false,
          error: 'Corrupted data decryption should fail',
          duration: Date.now() - start
        }
      }

      return {
        testName: 'Data Integrity Validation',
        passed: true,
        duration: Date.now() - start
      }
    } catch (error) {
      return {
        testName: 'Data Integrity Validation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start
      }
    }
  }

  /**
   * Generates a test report
   */
  static generateTestReport(results: TestResult[]): string {
    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => r.passed === false).length
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0)

    let report = `Encryption Test Suite Results\n`
    report += `============================\n\n`
    report += `Total Tests: ${results.length}\n`
    report += `Passed: ${passed}\n`
    report += `Failed: ${failed}\n`
    report += `Total Duration: ${totalDuration}ms\n\n`

    if (failed > 0) {
      report += `Failed Tests:\n`
      report += `-------------\n`
      results
        .filter(r => !r.passed)
        .forEach(r => {
          report += `❌ ${r.testName}: ${r.error}\n`
        })
      report += `\n`
    }

    report += `All Tests:\n`
    report += `----------\n`
    results.forEach(r => {
      const status = r.passed ? '✅' : '❌'
      const duration = r.duration ? ` (${r.duration}ms)` : ''
      report += `${status} ${r.testName}${duration}\n`
      if (!r.passed && r.error) {
        report += `   Error: ${r.error}\n`
      }
    })

    return report
  }
}