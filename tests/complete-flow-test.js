#!/usr/bin/env node

/**
 * Complete Flow Test - Tests the entire VC workflow
 * 
 * Flow:
 * 1. Issue a Verifiable Credential
 * 2. Create a Verifiable Presentation  
 * 3. Verify the Presentation
 * 4. Test various scenarios and edge cases
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Test configuration
const config = {
  issuerPath: path.join(rootDir, 'issuer and verifier'),
  holderPath: path.join(rootDir, 'holder', 'verifiable-credentials-project'),
  testData: {
    credential: {
      studentId: 'did:student:test123456789',
      studentName: 'Maria Test Silva',
      degreeName: 'Mestrado em Cibersegurança - Teste',
      finalGrade: 18.5,
      graduationDate: '2025-06-07',
      institution: 'Universidade de Aveiro - Teste'
    },
    presentation: {
      challenge: 'test-challenge-123',
      domain: 'https://test.example.com/'
    }
  }
};

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green
      error: '\x1b[31m',    // Red
      warning: '\x1b[33m',  // Yellow
      reset: '\x1b[0m'      // Reset
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

  async execCommand(command, cwd = rootDir, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const process = exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`));
        } else {
          resolve({ stdout, stderr });
        }
      });

      setTimeout(() => {
        process.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readJsonFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
    }
  }

  async writeJsonFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      throw new Error(`Failed to write JSON file ${filePath}: ${error.message}`);
    }
  }

  validateVC(vc) {
    const required = ['@context', 'type', 'credentialSubject', 'issuer', 'issuanceDate', 'proof'];
    
    for (const field of required) {
      if (!vc[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(vc['@context']) || !vc['@context'].includes('https://www.w3.org/2018/credentials/v1')) {
      throw new Error('Invalid @context');
    }

    if (!Array.isArray(vc.type) || !vc.type.includes('VerifiableCredential')) {
      throw new Error('Invalid type');
    }

    if (!vc.credentialSubject.id || !vc.credentialSubject.name) {
      throw new Error('Invalid credentialSubject');
    }

    if (!vc.proof.type || !vc.proof.proofValue) {
      throw new Error('Invalid proof');
    }
  }

  validateVP(vp) {
    const required = ['@context', 'type', 'holder', 'verifiableCredential', 'proof'];
    
    for (const field of required) {
      if (!vp[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(vp.type) || !vp.type.includes('VerifiablePresentation')) {
      throw new Error('Invalid type');
    }

    if (!Array.isArray(vp.verifiableCredential) || vp.verifiableCredential.length === 0) {
      throw new Error('No verifiable credentials in presentation');
    }

    if (!vp.proof.challenge || !vp.proof.domain) {
      throw new Error('Missing challenge or domain in proof');
    }
  }

  async cleanup() {
    const filesToClean = [
      path.join(config.issuerPath, 'credential.json'),
      path.join(config.issuerPath, 'vc.json'),
      path.join(config.issuerPath, 'temp_vp.json'),
      path.join(config.holderPath, 'vc.json'),
      path.join(config.holderPath, 'vp.json'),
      path.join(config.holderPath, 'vpEcdsaKeyPair.json')
    ];

    for (const file of filesToClean) {
      try {
        await fs.unlink(file);
      } catch {
        // Ignore errors - file might not exist
      }
    }
  }

  async runTests() {
    this.log('🚀 Starting Complete Flow Test Suite', 'info');
    this.log('=====================================', 'info');

    // Cleanup before starting
    await this.cleanup();

    // Test 1: Issue Verifiable Credential
    await this.test('Issue Verifiable Credential', async () => {
      // Create credential input
      const credentialInput = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://www.w3.org/2018/credentials/examples/v1",
          "https://example.org/contexts/university-degree/v1"
        ],
        "type": ["VerifiableCredential", "UniversityDegreeCredential"],
        "credentialSubject": {
          "id": config.testData.credential.studentId,
          "name": config.testData.credential.studentName,
          "degree": {
            "type": "BachelorDegree",
            "name": config.testData.credential.degreeName,
            "finalGrade": config.testData.credential.finalGrade,
            "graduationDate": config.testData.credential.graduationDate,
            "institution": config.testData.credential.institution,
            "gradeScale": "0-20"
          }
        }
      };

      const credentialPath = path.join(config.issuerPath, 'credential.json');
      await this.writeJsonFile(credentialPath, credentialInput);

      // Run issuer
      const { stdout } = await this.execCommand('node issuer.js', config.issuerPath);
      
      if (!stdout.includes('SIGNED CREDENTIAL')) {
        throw new Error('Issuer did not produce expected output');
      }

      // Check if VC was created
      const vcPath = path.join(config.issuerPath, 'vc.json');
      if (!await this.fileExists(vcPath)) {
        throw new Error('vc.json was not created');
      }

      // Validate VC structure
      const vc = await this.readJsonFile(vcPath);
      this.validateVC(vc);

      this.log(`✓ VC issued with ID: ${vc.credentialSubject.id}`, 'success');
    });

    // Test 2: Copy VC to Holder
    await this.test('Copy VC to Holder', async () => {
      const issuerVcPath = path.join(config.issuerPath, 'vc.json');
      const holderVcPath = path.join(config.holderPath, 'vc.json');
      
      const vc = await this.readJsonFile(issuerVcPath);
      await this.writeJsonFile(holderVcPath, vc);
      
      if (!await this.fileExists(holderVcPath)) {
        throw new Error('Failed to copy VC to holder');
      }

      this.log('✓ VC copied to holder successfully', 'success');
    });

    // Test 3: Create Verifiable Presentation
    await this.test('Create Verifiable Presentation', async () => {
      // Set environment variables
      process.env.CHALLENGE = config.testData.presentation.challenge;
      process.env.DOMAIN = config.testData.presentation.domain;

      // Run holder script
      const { stdout } = await this.execCommand('node holder.js', config.holderPath);
      
      if (!stdout.includes('VP created successfully')) {
        throw new Error('Holder did not create VP successfully');
      }

      // Check if VP was created
      const vpPath = path.join(config.holderPath, 'vp.json');
      if (!await this.fileExists(vpPath)) {
        throw new Error('vp.json was not created');
      }

      // Validate VP structure
      const vp = await this.readJsonFile(vpPath);
      this.validateVP(vp);

      // Check challenge and domain
      if (vp.proof.challenge !== config.testData.presentation.challenge) {
        throw new Error('Challenge mismatch in VP');
      }

      if (vp.proof.domain !== config.testData.presentation.domain) {
        throw new Error('Domain mismatch in VP');
      }

      this.log(`✓ VP created with holder: ${vp.holder}`, 'success');
    });

    // Test 4: Copy VP to Verifier
    await this.test('Copy VP to Verifier', async () => {
      const holderVpPath = path.join(config.holderPath, 'vp.json');
      const verifierVpPath = path.join(config.issuerPath, 'temp_vp.json');
      
      const vp = await this.readJsonFile(holderVpPath);
      await this.writeJsonFile(verifierVpPath, vp);
      
      if (!await this.fileExists(verifierVpPath)) {
        throw new Error('Failed to copy VP to verifier');
      }

      this.log('✓ VP copied to verifier successfully', 'success');
    });

    // Test 5: Verify Presentation
    await this.test('Verify Verifiable Presentation', async () => {
      // Set environment variables for verifier
      process.env.VERIFY_CHALLENGE = config.testData.presentation.challenge;
      process.env.VERIFY_DOMAIN = config.testData.presentation.domain;
      process.env.VP_FILE = 'temp_vp.json';

      // Run verifier
      const { stdout } = await this.execCommand('node verifier.js', config.issuerPath);
      
      if (!stdout.includes('Verification result:')) {
        throw new Error('Verifier did not produce verification result');
      }

      // Extract verification result
      const lines = stdout.split('\n');
      const resultLine = lines.find(line => line.includes('Verification result:'));
      
      if (!resultLine) {
        throw new Error('Could not find verification result in output');
      }

      const jsonStr = resultLine.replace('Verification result:', '').trim();
      const result = JSON.parse(jsonStr);

      if (!result.verified) {
        throw new Error(`Verification failed: ${JSON.stringify(result.error || 'Unknown error')}`);
      }

      this.log('✓ VP verified successfully', 'success');
    });

    // Test 6: Test Invalid Challenge
    await this.test('Test Invalid Challenge Rejection', async () => {
      process.env.VERIFY_CHALLENGE = 'wrong-challenge';
      process.env.VERIFY_DOMAIN = config.testData.presentation.domain;
      process.env.VP_FILE = 'temp_vp.json';

      const { stdout } = await this.execCommand('node verifier.js', config.issuerPath);
      
      const lines = stdout.split('\n');
      const resultLine = lines.find(line => line.includes('Verification result:'));
      
      if (resultLine) {
        const jsonStr = resultLine.replace('Verification result:', '').trim();
        const result = JSON.parse(jsonStr);

        if (result.verified) {
          throw new Error('Verification should have failed with wrong challenge');
        }
      }

      this.log('✓ Invalid challenge correctly rejected', 'success');
    });

    // Test 7: Test Invalid Domain
    await this.test('Test Invalid Domain Rejection', async () => {
      process.env.VERIFY_CHALLENGE = config.testData.presentation.challenge;
      process.env.VERIFY_DOMAIN = 'https://wrong.domain.com/';
      process.env.VP_FILE = 'temp_vp.json';

      const { stdout } = await this.execCommand('node verifier.js', config.issuerPath);
      
      const lines = stdout.split('\n');
      const resultLine = lines.find(line => line.includes('Verification result:'));
      
      if (resultLine) {
        const jsonStr = resultLine.replace('Verification result:', '').trim();
        const result = JSON.parse(jsonStr);

        if (result.verified) {
          throw new Error('Verification should have failed with wrong domain');
        }
      }

      this.log('✓ Invalid domain correctly rejected', 'success');
    });

    // Cleanup after tests
    await this.cleanup();

    // Display results
    this.log('=====================================', 'info');
    this.log('🏁 Test Results Summary', 'info');
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
      this.log('\n🎉 All tests passed! The VC flow is working correctly.', 'success');
      process.exit(0);
    } else {
      this.log('\n💥 Some tests failed. Please check the implementation.', 'error');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}