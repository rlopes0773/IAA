#!/usr/bin/env node

/**
 * API Integration Test - Tests the HTTP APIs
 * 
 * Tests:
 * 1. Issuer API endpoints
 * 2. Holder API endpoints  
 * 3. Verifier API endpoints
 * 4. Error handling
 * 5. Data validation
 */

import fetch from 'node-fetch';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

class APITestRunner {
  constructor() {
    this.results = { total: 0, passed: 0, failed: 0, errors: [] };
    this.servers = [];
    this.issuerUrl = 'http://localhost:3000';
    this.holderUrl = 'http://localhost:3001';
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

  async startServer(name, command, cwd, port) {
    return new Promise((resolve, reject) => {
      const server = spawn('npm', ['start'], { cwd, stdio: 'pipe' });
      
      let started = false;
      const timeout = setTimeout(() => {
        if (!started) {
          server.kill();
          reject(new Error(`${name} server failed to start within timeout`));
        }
      }, 15000);

      server.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes(`localhost:${port}`) || output.includes(`port ${port}`)) {
          if (!started) {
            started = true;
            clearTimeout(timeout);
            this.log(`✓ ${name} server started on port ${port}`, 'success');
            resolve(server);
          }
        }
      });

      server.stderr.on('data', (data) => {
        console.error(`${name} stderr:`, data.toString());
      });

      server.on('close', (code) => {
        if (!started) {
          reject(new Error(`${name} server exited with code ${code}`));
        }
      });

      this.servers.push(server);
    });
  }

  async waitForServer(url, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.status < 500) {
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Server at ${url} not responding after ${maxAttempts} attempts`);
  }

  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();
      return { response, data };
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async stopServers() {
    for (const server of this.servers) {
      server.kill();
    }
    this.servers = [];
    
    // Wait a moment for processes to clean up
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async runTests() {
    this.log('🚀 Starting API Integration Test Suite', 'info');
    this.log('====================================', 'info');

    try {
      // Start servers
      this.log('Starting servers...', 'info');
      
      const issuerPath = path.join(rootDir, 'issuer and verifier');
      const holderPath = path.join(rootDir, 'holder', 'verifiable-credentials-project');

      await this.startServer('Issuer/Verifier', 'npm start', issuerPath, 3000);
      await this.startServer('Holder', 'npm start', holderPath, 3001);

      // Wait for servers to be ready
      await this.waitForServer(this.issuerUrl);
      await this.waitForServer(this.holderUrl);

      this.log('Both servers are ready!', 'success');

      // Test data
      const testCredential = {
        studentId: 'did:student:api-test-123',
        studentName: 'API Test User',
        degreeName: 'Mestrado em API Testing',
        finalGrade: 19.0,
        graduationDate: '2025-06-07',
        institution: 'Universidade de API Tests'
      };

      const testChallenge = 'api-test-challenge-123';
      const testDomain = 'https://api-test.example.com/';

      let issuedCredential;
      let createdPresentation;

      // Test 1: Issuer API Status
      await this.test('Issuer API Status Check', async () => {
        const { response, data } = await this.makeRequest(`${this.issuerUrl}/api/status`);
        
        if (response.status !== 200) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        if (!data.message) {
          throw new Error('Status response missing message');
        }

        this.log(`✓ Issuer status: ${data.message}`, 'success');
      });

      // Test 2: Issue Credential via API
      await this.test('Issue Credential via API', async () => {
        const { response, data } = await this.makeRequest(`${this.issuerUrl}/api/issue`, {
          method: 'POST',
          body: JSON.stringify(testCredential)
        });

        if (response.status !== 200) {
          throw new Error(`Issue failed: ${response.status} - ${JSON.stringify(data)}`);
        }

        if (!data.success) {
          throw new Error(`Issue failed: ${data.error}`);
        }

        if (!data.verifiableCredential) {
          throw new Error('No verifiable credential in response');
        }

        issuedCredential = data.verifiableCredential;

        // Validate credential structure
        const vc = issuedCredential;
        if (!vc['@context'] || !vc.type || !vc.credentialSubject) {
          throw new Error('Invalid credential structure');
        }

        if (vc.credentialSubject.name !== testCredential.studentName) {
          throw new Error('Credential data mismatch');
        }

        this.log(`✓ Credential issued for: ${vc.credentialSubject.name}`, 'success');
      });

      // Test 3: Save Credential to Holder
      await this.test('Save Credential to Holder', async () => {
        const { response, data } = await this.makeRequest(`${this.holderUrl}/api/save-credential`, {
          method: 'POST',
          body: JSON.stringify({ credential: issuedCredential })
        });

        if (response.status !== 200) {
          throw new Error(`Save failed: ${response.status} - ${JSON.stringify(data)}`);
        }

        if (data.error) {
          throw new Error(`Save failed: ${data.error}`);
        }

        this.log('✓ Credential saved to holder', 'success');
      });

      // Test 4: Create Presentation via API
      await this.test('Create Presentation via API', async () => {
        const { response, data } = await this.makeRequest(`${this.holderUrl}/api/create-presentation`, {
          method: 'POST',
          body: JSON.stringify({
            challenge: testChallenge,
            domain: testDomain
          })
        });

        if (response.status !== 200) {
          throw new Error(`Presentation creation failed: ${response.status} - ${JSON.stringify(data)}`);
        }

        if (data.error) {
          throw new Error(`Presentation creation failed: ${data.error}`);
        }

        if (!data.presentation) {
          throw new Error('No presentation in response');
        }

        createdPresentation = data.presentation;

        // Validate presentation structure
        const vp = createdPresentation;
        if (!vp.type || !vp.type.includes('VerifiablePresentation')) {
          throw new Error('Invalid presentation type');
        }

        if (!vp.verifiableCredential || vp.verifiableCredential.length === 0) {
          throw new Error('No credentials in presentation');
        }

        if (vp.proof.challenge !== testChallenge) {
          throw new Error('Challenge mismatch in presentation');
        }

        this.log(`✓ Presentation created with holder: ${vp.holder}`, 'success');
      });

      // Test 5: Verify Presentation via API
      await this.test('Verify Presentation via API', async () => {
        const { response, data } = await this.makeRequest(`${this.issuerUrl}/api/verify`, {
          method: 'POST',
          body: JSON.stringify({
            presentation: createdPresentation,
            challenge: testChallenge,
            domain: testDomain
          })
        });

        if (response.status !== 200) {
          throw new Error(`Verification failed: ${response.status} - ${JSON.stringify(data)}`);
        }

        if (!data.success) {
          throw new Error(`Verification failed: ${data.error || 'Unknown error'}`);
        }

        if (!data.verified) {
          throw new Error(`Presentation verification failed: ${JSON.stringify(data.verificationResult)}`);
        }

        this.log('✓ Presentation verified successfully', 'success');
      });

      // Test 6: Test Invalid Data Handling
      await this.test('Test Invalid Grade Rejection', async () => {
        const invalidCredential = {
          ...testCredential,
          finalGrade: 25.0 // Invalid grade > 20
        };

        const { response, data } = await this.makeRequest(`${this.issuerUrl}/api/issue`, {
          method: 'POST',
          body: JSON.stringify(invalidCredential)
        });

        if (response.status === 200 && data.success) {
          throw new Error('Should have rejected invalid grade');
        }

        this.log('✓ Invalid grade correctly rejected', 'success');
      });

      // Test 7: Test Missing Required Fields
      await this.test('Test Missing Required Fields', async () => {
        const incompleteCredential = {
          studentId: 'did:student:incomplete',
          // Missing other required fields
        };

        const { response, data } = await this.makeRequest(`${this.issuerUrl}/api/issue`, {
          method: 'POST',
          body: JSON.stringify(incompleteCredential)
        });

        if (response.status === 200 && data.success) {
          throw new Error('Should have rejected incomplete credential');
        }
        this.log('✓ Incomplete credential correctly rejected', 'success');
      }
      );    
    }   catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`, 'error');
    }   finally {   
      // Stop servers
      await this.stopServers();
      this.log('All servers stopped', 'info');

      // Print summary
      this.log('====================================', 'info');
      this.log(`Total Tests: ${this.results.total}`, 'info');
      this.log(`Passed: ${this.results.passed}`, 'success');
      this.log(`Failed: ${this.results.failed}`, 'error');

      if (this.results.errors.length > 0) {
        this.log('Errors:', 'warning');
        for (const error of this.results.errors) {
          this.log(`- ${error.test}: ${error.error}`, 'error');
        }
      }
    }
  }
}
async function main() {
  const testRunner = new APITestRunner();
  await testRunner.runTests();
}
main().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
// Ensure the script exits cleanly on unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});
// Ensure the script exits cleanly on uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
// Ensure the script exits cleanly on SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('Test suite interrupted. Stopping servers...');
  process.exit(0);
});
// Ensure the script exits cleanly on SIGTERM
process.on('SIGTERM', () => {
  console.log('Test suite terminated. Stopping servers...');
  process.exit(0);
});
// Ensure the script exits cleanly on exit
process.on('exit', (code) => {
  console.log(`Test suite exited with code ${code}`);
});
// Ensure the script exits cleanly on SIGQUIT
process.on('SIGQUIT', () => {
  console.log('Test suite quit. Stopping servers...');
  process.exit(0);
});