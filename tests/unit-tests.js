#!/usr/bin/env node

/**
 * Unit Tests - Tests individual components and functions
 * 
 * Tests:
 * 1. Credential validation
 * 2. Presentation validation
 * 3. JSON-LD context loading
 * 4. Key generation
 * 5. DID creation
 * 6. Cryptographic operations
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as DidKey from '@digitalbazaar/did-method-key';
import * as EcdsaMultikey from '@digitalbazaar/ecdsa-multikey';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

class UnitTestRunner {
  constructor() {
    this.results = { total: 0, passed: 0, failed: 0, errors: [] };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async test(name, testFn) {
    this.results.total++;
    this.log(`Testing: ${name}`, 'info');
    
    try {
      await testFn();
      this.results.passed++;
      this.log(`✅ PASSED: ${name}`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: name, error: error.message });
      this.log(`❌ FAILED: ${name} - ${error.message}`, 'error');
    }
  }

  assertEquals(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
  }

  assertTrue(condition, message = '') {
    if (!condition) {
      throw new Error(`Assertion failed: ${message || 'Expected true but got false'}`);
    }
  }

  assertFalse(condition, message = '') {
    if (condition) {
      throw new Error(`Assertion failed: ${message || 'Expected false but got true'}`);
    }
  }

  assertThrows(fn, expectedError = null, message = '') {
    try {
      fn();
      throw new Error(`Expected function to throw but it didn't: ${message}`);
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Expected error containing "${expectedError}" but got "${error.message}"`);
      }
    }
  }

  async assertThrowsAsync(fn, expectedError = null, message = '') {
    try {
      await fn();
      throw new Error(`Expected async function to throw but it didn't: ${message}`);
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Expected error containing "${expectedError}" but got "${error.message}"`);
      }
    }
  }

  isValidDID(did) {
    return typeof did === 'string' && did.startsWith('did:');
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  isValidProof(proof) {
    return proof && 
           typeof proof.type === 'string' && 
           typeof proof.proofValue === 'string' &&
           this.isValidDate(proof.created);
  }

  validateCredentialStructure(vc) {
    // Required fields
    this.assertTrue(Array.isArray(vc['@context']), 'VC must have @context array');
    this.assertTrue(vc['@context'].includes('https://www.w3.org/2018/credentials/v1'), 'VC must include base context');
    this.assertTrue(Array.isArray(vc.type), 'VC must have type array');
    this.assertTrue(vc.type.includes('VerifiableCredential'), 'VC must include VerifiableCredential type');
    this.assertTrue(typeof vc.credentialSubject === 'object', 'VC must have credentialSubject');
    this.assertTrue(this.isValidDID(vc.issuer), 'VC must have valid issuer DID');
    this.assertTrue(this.isValidDate(vc.issuanceDate), 'VC must have valid issuanceDate');
    this.assertTrue(this.isValidProof(vc.proof), 'VC must have valid proof');
    
    // Credential subject validation
    this.assertTrue(this.isValidDID(vc.credentialSubject.id), 'Credential subject must have valid ID');
    this.assertTrue(typeof vc.credentialSubject.name === 'string', 'Credential subject must have name');
  }

  validatePresentationStructure(vp) {
    // Required fields
    this.assertTrue(Array.isArray(vp['@context']), 'VP must have @context array');
    this.assertTrue(vp['@context'].includes('https://www.w3.org/2018/credentials/v1'), 'VP must include base context');
    this.assertTrue(Array.isArray(vp.type), 'VP must have type array');
    this.assertTrue(vp.type.includes('VerifiablePresentation'), 'VP must include VerifiablePresentation type');
    this.assertTrue(this.isValidDID(vp.holder), 'VP must have valid holder DID');
    this.assertTrue(Array.isArray(vp.verifiableCredential), 'VP must have verifiableCredential array');
    this.assertTrue(vp.verifiableCredential.length > 0, 'VP must contain at least one credential');
    this.assertTrue(this.isValidProof(vp.proof), 'VP must have valid proof');
    
    // Proof-specific validation
    this.assertTrue(typeof vp.proof.challenge === 'string', 'VP proof must have challenge');
    this.assertTrue(typeof vp.proof.domain === 'string', 'VP proof must have domain');
  }

  async runTests() {
    this.log('🚀 Starting Unit Test Suite', 'info');
    this.log('===========================', 'info');

    // Test 1: Credential Structure Validation
    await this.test('Validate Valid Credential Structure', async () => {
      const validVC = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://www.w3.org/2018/credentials/examples/v1"
        ],
        "type": ["VerifiableCredential", "UniversityDegreeCredential"],
        "credentialSubject": {
          "id": "did:student:test123",
          "name": "Test Student",
          "degree": {
            "type": "BachelorDegree",
            "name": "Computer Science"
          }
        },
        "issuer": "did:key:test-issuer",
        "issuanceDate": "2025-06-07T12:00:00Z",
        "proof": {
          "type": "DataIntegrityProof",
          "created": "2025-06-07T12:00:00Z",
          "proofValue": "test-proof-value"
        }
      };

      this.validateCredentialStructure(validVC);
    });

    // Test 2: Invalid Credential Detection
    await this.test('Detect Invalid Credential Structure', async () => {
      const invalidVC = {
        "@context": "not-an-array", // Should be array
        "type": ["VerifiableCredential"],
        "credentialSubject": {
          "id": "not-a-did", // Invalid DID format
          "name": "Test"
        },
        "issuer": "not-a-did", // Invalid DID format
        "issuanceDate": "invalid-date", // Invalid date
        "proof": {} // Missing required proof fields
      };

      this.assertThrows(() => this.validateCredentialStructure(invalidVC), '@context');
    });

    // Test 3: Presentation Structure Validation
    await this.test('Validate Valid Presentation Structure', async () => {
      const validVP = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://w3id.org/security/data-integrity/v2"
        ],
        "type": ["VerifiablePresentation"],
        "holder": "did:key:test-holder",
        "verifiableCredential": [
          {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            "type": ["VerifiableCredential"],
            "credentialSubject": {
              "id": "did:student:test",
              "name": "Test Student"
            },
            "issuer": "did:key:test-issuer",
            "issuanceDate": "2025-06-07T12:00:00Z",
            "proof": {
              "type": "DataIntegrityProof",
              "created": "2025-06-07T12:00:00Z",
              "proofValue": "test-proof"
            }
          }
        ],
        "proof": {
          "type": "DataIntegrityProof",
          "created": "2025-06-07T12:00:00Z",
          "challenge": "test-challenge",
          "domain": "https://example.com/",
          "proofValue": "test-proof-value"
        }
      };

      this.validatePresentationStructure(validVP);
    });

    // Test 4: Key Generation Test
    await this.test('ECDSA Key Generation', async () => {
      const keyPair = await EcdsaMultikey.generate({
        curve: 'P-256'
      });

      this.assertTrue(keyPair.publicKey, 'Key pair should have public key');
      this.assertTrue(keyPair.privateKey, 'Key pair should have private key');
      this.assertTrue(typeof keyPair.signer === 'function', 'Key pair should have signer function');
      this.assertTrue(typeof keyPair.verifier === 'function', 'Key pair should have verifier function');
      
      this.log(`✓ Generated key with ID: ${keyPair.id || 'no-id'}`, 'success');
    });

    // Test 5: DID Key Method Test
    await this.test('DID Key Method Creation', async () => {
      const keyPair = await EcdsaMultikey.generate({
        curve: 'P-256'
      });

      const didKeyDriver = DidKey.driver();
      didKeyDriver.use({
        multibaseMultikeyHeader: 'zDna',
        fromMultibase: EcdsaMultikey.from
      });

      const { didDocument, keyPair: derivedKeyPair } = await didKeyDriver.fromKeyPair({
        verificationKeyPair: keyPair
      });

      this.assertTrue(this.isValidDID(didDocument.id), 'Should generate valid DID');
      this.assertTrue(didDocument.id.startsWith('did:key:'), 'Should be did:key method');
      this.assertTrue(Array.isArray(didDocument.verificationMethod), 'Should have verification methods');
      this.assertTrue(didDocument.verificationMethod.length > 0, 'Should have at least one verification method');
      
      this.log(`✓ Generated DID: ${didDocument.id}`, 'success');
    });

    // Test 6: Context File Validation
    await this.test('Context File Structure Validation', async () => {
      const contextPath = path.join(rootDir, 'issuer and verifier', 'contexts', 'university-degree-v1.json');
      
      try {
        const contextContent = await fs.readFile(contextPath, 'utf8');
        const context = JSON.parse(contextContent);
        
        this.assertTrue(typeof context === 'object', 'Context should be object');
        this.assertTrue(context['@context'], 'Context should have @context field');
        this.assertTrue(typeof context['@context'] === 'object', 'Context @context should be object');
        this.assertTrue(context['@context']['@version'], 'Context should have version');
        
        // Check specific fields for university degree context
        this.assertTrue(context['@context']['name'], 'Should define name field');
        this.assertTrue(context['@context']['institution'], 'Should define institution field');
        this.assertTrue(context['@context']['finalGrade'], 'Should define finalGrade field');
        
        this.log('✓ University degree context is valid', 'success');
      } catch (error) {
        throw new Error(`Context file validation failed: ${error.message}`);
      }
    });

    // Test 7: Date Validation
    await this.test('Date Format Validation', async () => {
      const validDates = [
        '2025-06-07T12:00:00Z',
        '2025-06-07T12:00:00.123Z',
        '2025-06-07T12:00:00+00:00',
        '2025-06-07'
      ];

      const invalidDates = [
        'not-a-date',
        '2025-13-40', // Invalid month and day
        '2025/06/07', // Wrong format
        ''
      ];

      validDates.forEach(date => {
        this.assertTrue(this.isValidDate(date), `${date} should be valid`);
      });

      invalidDates.forEach(date => {
        this.assertFalse(this.isValidDate(date), `${date} should be invalid`);
      });
    });

    // Test 8: DID Format Validation
    await this.test('DID Format Validation', async () => {
      const validDIDs = [
        'did:key:zDnaeggoimTeKBmP6PRfxnepFx3pcrp1SeBeLAzKAuzujUAiw',
        'did:student:ebfeb1f712ebc6f1c276e12ec21',
        'did:web:example.com',
        'did:method:identifier'
      ];

      const invalidDIDs = [
        'not-a-did',
        'did:', // Missing method and identifier
        'did:method:', // Missing identifier
        'http://example.com', // Not a DID
        ''
      ];

      validDIDs.forEach(did => {
        this.assertTrue(this.isValidDID(did), `${did} should be valid DID`);
      });

      invalidDIDs.forEach(did => {
        this.assertFalse(this.isValidDID(did), `${did} should be invalid DID`);
      });
    });

    // Test 9: Grade Validation Logic
    await this.test('Grade Validation Logic', async () => {
      const validateGrade = (grade, scale = '0-20') => {
        const numGrade = parseFloat(grade);
        if (isNaN(numGrade)) return false;
        
        if (scale === '0-20') {
          return numGrade >= 0 && numGrade <= 20;
        }
        return false;
      };

      // Valid grades
      this.assertTrue(validateGrade(17.5), '17.5 should be valid');
      this.assertTrue(validateGrade(0), '0 should be valid');
      this.assertTrue(validateGrade(20), '20 should be valid');
      this.assertTrue(validateGrade('18.5'), 'String "18.5" should be valid');

      // Invalid grades
      this.assertFalse(validateGrade(-1), '-1 should be invalid');
      this.assertFalse(validateGrade(21), '21 should be invalid');
      this.assertFalse(validateGrade('not-a-number'), 'Non-numeric should be invalid');
      this.assertFalse(validateGrade(null), 'null should be invalid');
    });

    // Test 10: Challenge/Domain Validation
    await this.test('Challenge and Domain Validation', async () => {
      const validateChallenge = (challenge) => {
        return typeof challenge === 'string' && challenge.length > 0;
      };

      const validateDomain = (domain) => {
        try {
          new URL(domain);
          return true;
        } catch {
          return false;
        }
      };

      // Valid challenges
      this.assertTrue(validateChallenge('abc123'), 'Simple challenge should be valid');
      this.assertTrue(validateChallenge('complex-challenge-with-123'), 'Complex challenge should be valid');

      // Invalid challenges
      this.assertFalse(validateChallenge(''), 'Empty challenge should be invalid');
      this.assertFalse(validateChallenge(null), 'null challenge should be invalid');

      // Valid domains
      this.assertTrue(validateDomain('https://example.com/'), 'HTTPS URL should be valid');
      this.assertTrue(validateDomain('http://localhost:3000/'), 'HTTP localhost should be valid');

      // Invalid domains
      this.assertFalse(validateDomain('not-a-url'), 'Non-URL should be invalid');
      this.assertFalse(validateDomain(''), 'Empty domain should be invalid');
    });

    // Display results
    this.log('===========================', 'info');
    this.log('🏁 Unit Test Results Summary', 'info');
    this.log(`Total Tests: ${this.results.total}`, 'info');
    this.log(`Passed: ${this.results.passed}`, 'success');
    this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');

    if (this.results.errors.length > 0) {
      this.log('\n❌ Failed Tests:', 'error');
      this.results.errors.forEach(({ test, error }) => {
        this.log(`  - ${test}: ${error}`, 'error');
      });
    }

    if (this.results.failed === 0) {
      this.log('\n🎉 All unit tests passed!', 'success');
      return true;
    } else {
      this.log('\n💥 Some unit tests failed.', 'error');
      return false;
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new UnitTestRunner();
  runner.runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Unit test runner failed:', error);
    process.exit(1);
  });
}