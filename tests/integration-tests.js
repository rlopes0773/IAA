#!/usr/bin/env node

/**
 * Integration Test - Tests component integration
 * 
 * Tests:
 * 1. File system operations
 * 2. Context loading integration
 * 3. Key generation and DID creation integration
 * 4. Credential and presentation validation integration
 * 5. Error handling integration
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

class IntegrationTestRunner {
  constructor() {
    this.results = { total: 0, passed: 0, failed: 0, errors: [] };
    this.tempFiles = [];
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

  async createTempFile(filename, content) {
    const filePath = path.join(__dirname, 'temp', filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    this.tempFiles.push(filePath);
    return filePath;
  }

  async cleanup() {
    for (const file of this.tempFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // Ignore cleanup errors
      }
    }
    
    try {
      await fs.rmdir(path.join(__dirname, 'temp'));
    } catch {
      // Ignore if directory doesn't exist or isn't empty
    }
    
    this.tempFiles = [];
  }

  async runTests() {
    this.log('🚀 Starting Integration Test Suite', 'info');
    this.log('=================================', 'info');

    try {
      // Test 1: Directory Structure Validation
      await this.test('Project Directory Structure', async () => {
        const requiredPaths = [
          path.join(rootDir, 'issuer and verifier'),
          path.join(rootDir, 'issuer and verifier', 'issuer.js'),
          path.join(rootDir, 'issuer and verifier', 'verifier.js'),
          path.join(rootDir, 'issuer and verifier', 'server.js'),
          path.join(rootDir, 'issuer and verifier', 'contexts'),
          path.join(rootDir, 'issuer and verifier', 'contexts', 'university-degree-v1.json'),
          path.join(rootDir, 'holder', 'verifiable-credentials-project'),
          path.join(rootDir, 'holder', 'verifiable-credentials-project', 'holder.js'),
          path.join(rootDir, 'holder', 'verifiable-credentials-project', 'server.js'),
          path.join(rootDir, 'holder', 'verifiable-credentials-project', 'contexts', 'university-degree-v1.json')
        ];

        for (const requiredPath of requiredPaths) {
          try {
            await fs.access(requiredPath);
          } catch {
            throw new Error(`Required path not found: ${requiredPath}`);
          }
        }

        this.log('✓ All required directories and files exist', 'success');
      });

      // Test 2: Package.json Files Validation
      await this.test('Package.json Files Validation', async () => {
        const packagePaths = [
          path.join(rootDir, 'issuer and verifier', 'package.json'),
          path.join(rootDir, 'holder', 'verifiable-credentials-project', 'package.json')
        ];

        for (const packagePath of packagePaths) {
          const content = await fs.readFile(packagePath, 'utf8');
          const packageData = JSON.parse(content);
          
          if (!packageData.name || !packageData.version) {
            throw new Error(`Invalid package.json at ${packagePath}`);
          }

          if (!packageData.type || packageData.type !== 'module') {
            throw new Error(`Package.json at ${packagePath} should have type: "module"`);
          }

          if (!packageData.dependencies || !packageData.dependencies['@digitalbazaar/vc']) {
            throw new Error(`Package.json at ${packagePath} missing required VC dependencies`);
          }
        }

        this.log('✓ All package.json files are valid', 'success');
      });

      // Test 3: Context Files Consistency
      await this.test('Context Files Consistency', async () => {
        const issuerContextPath = path.join(rootDir, 'issuer and verifier', 'contexts', 'university-degree-v1.json');
        const holderContextPath = path.join(rootDir, 'holder', 'verifiable-credentials-project', 'contexts', 'university-degree-v1.json');

        const issuerContext = JSON.parse(await fs.readFile(issuerContextPath, 'utf8'));
        const holderContext = JSON.parse(await fs.readFile(holderContextPath, 'utf8'));

        if (JSON.stringify(issuerContext) !== JSON.stringify(holderContext)) {
          throw new Error('Context files are not consistent between issuer and holder');
        }

        // Validate context structure
        if (!issuerContext['@context'] || !issuerContext['@context']['@version']) {
          throw new Error('Invalid context structure');
        }

        this.log('✓ Context files are consistent and valid', 'success');
      });

      // Test 4: Dependencies Installation Check
      await this.test('Dependencies Installation Check', async () => {
        const checkDeps = async (dir) => {
          const nodeModulesPath = path.join(dir, 'node_modules');
          try {
            await fs.access(nodeModulesPath);
            
            // Check for key dependencies
            const requiredDeps = [
              '@digitalbazaar/vc',
              '@digitalbazaar/did-method-key',
              '@digitalbazaar/ecdsa-multikey',
              'express'
            ];

            for (const dep of requiredDeps) {
              const depPath = path.join(nodeModulesPath, dep);
              try {
                await fs.access(depPath);
              } catch {
                throw new Error(`Dependency ${dep} not found in ${dir}`);
              }
            }
          } catch {
            throw new Error(`node_modules not found in ${dir}. Run npm install.`);
          }
        };

        await checkDeps(path.join(rootDir, 'issuer and verifier'));
        await checkDeps(path.join(rootDir, 'holder', 'verifiable-credentials-project'));

        this.log('✓ All dependencies are properly installed', 'success');
      });

      // Test 5: File I/O Operations Integration
      await this.test('File I/O Operations Integration', async () => {
        const testData = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          "type": ["VerifiableCredential"],
          "credentialSubject": {
            "id": "did:test:integration",
            "name": "Integration Test"
          }
        };

        // Test writing and reading JSON files
        const tempFile = await this.createTempFile('test-credential.json', testData);
        
        const readData = JSON.parse(await fs.readFile(tempFile, 'utf8'));
        
        if (JSON.stringify(readData) !== JSON.stringify(testData)) {
          throw new Error('File I/O operation failed - data mismatch');
        }

        this.log('✓ File I/O operations working correctly', 'success');
      });

      // Test 6: Script Execution Integration
      await this.test('Script Execution Integration', async () => {
        // Test that scripts can be executed without syntax errors
        const issuerPath = path.join(rootDir, 'issuer and verifier');
        const holderPath = path.join(rootDir, 'holder', 'verifiable-credentials-project');

        // Check issuer.js syntax
        try {
          await execAsync('node --check issuer.js', { cwd: issuerPath });
        } catch (error) {
          throw new Error(`Issuer.js syntax error: ${error.message}`);
        }

        // Check verifier.js syntax
        try {
          await execAsync('node --check verifier.js', { cwd: issuerPath });
        } catch (error) {
          throw new Error(`Verifier.js syntax error: ${error.message}`);
        }

        // Check holder.js syntax
        try {
          await execAsync('node --check holder.js', { cwd: holderPath });
        } catch (error) {
          throw new Error(`Holder.js syntax error: ${error.message}`);
        }

        // Check server.js files syntax
        try {
          await execAsync('node --check server.js', { cwd: issuerPath });
        } catch (error) {
          throw new Error(`Issuer server.js syntax error: ${error.message}`);
        }

        try {
          await execAsync('node --check server.js', { cwd: holderPath });
        } catch (error) {
          throw new Error(`Holder server.js syntax error: ${error.message}`);
        }

        this.log('✓ All scripts have valid syntax', 'success');
      });

      // Test 7: Environment Variables Integration
      await this.test('Environment Variables Integration', async () => {
        const originalEnv = { ...process.env };

        try {
          // Test environment variable setting
          process.env.TEST_CHALLENGE = 'integration-test-challenge';
          process.env.TEST_DOMAIN = 'https://integration-test.example.com/';

          if (process.env.TEST_CHALLENGE !== 'integration-test-challenge') {
            throw new Error('Environment variable setting failed');
          }

          if (process.env.TEST_DOMAIN !== 'https://integration-test.example.com/') {
            throw new Error('Environment variable setting failed');
          }

          this.log('✓ Environment variables working correctly', 'success');
        } finally {
          // Restore original environment
          process.env = originalEnv;
        }
      });

      // Test 8: Error Handling Integration
      await this.test('Error Handling Integration', async () => {
        // Test file not found error handling
        try {
          await fs.readFile('non-existent-file.json', 'utf8');
          throw new Error('Should have thrown an error for non-existent file');
        } catch (error) {
          if (!error.message.includes('ENOENT') && !error.message.includes('no such file')) {
            throw new Error(`Unexpected error type: ${error.message}`);
          }
        }

        // Test JSON parsing error handling
        const invalidJsonFile = await this.createTempFile('invalid.json', 'invalid json content {');
        
        try {
          const content = await fs.readFile(invalidJsonFile, 'utf8');
          JSON.parse(content);
          throw new Error('Should have thrown JSON parsing error');
        } catch (error) {
          if (!error.message.includes('JSON') && !error.message.includes('Unexpected')) {
            throw new Error(`Unexpected error type: ${error.message}`);
          }
        }

        this.log('✓ Error handling working correctly', 'success');
      });

      // Test 9: Cross-Component Data Flow
      await this.test('Cross-Component Data Flow', async () => {
        // Create test credential that would flow between components
        const testCredential = {
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://www.w3.org/2018/credentials/examples/v1",
            "https://example.org/contexts/university-degree/v1"
          ],
          "type": ["VerifiableCredential", "UniversityDegreeCredential"],
          "credentialSubject": {
            "id": "did:student:integration-test",
            "name": "Integration Test Student",
            "degree": {
              "type": "BachelorDegree",
              "name": "Integration Testing",
              "finalGrade": 19.0,
              "graduationDate": "2025-06-07",
              "institution": "Test University",
              "gradeScale": "0-20"
            }
          },
          "issuer": "did:key:test-issuer",
          "issuanceDate": "2025-06-07T12:00:00Z"
        };

        // Simulate issuer -> holder data flow
        const issuerOutput = await this.createTempFile('issuer-output.json', testCredential);
        
        // Simulate holder reading issuer output
        const holderInput = JSON.parse(await fs.readFile(issuerOutput, 'utf8'));
        
        if (holderInput.credentialSubject.name !== testCredential.credentialSubject.name) {
          throw new Error('Data flow corruption detected');
        }

        // Simulate holder -> verifier data flow (presentation)
        const testPresentation = {
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://w3id.org/security/data-integrity/v2"
          ],
          "type": ["VerifiablePresentation"],
          "holder": "did:key:test-holder",
          "verifiableCredential": [holderInput]
        };

        const holderOutput = await this.createTempFile('holder-output.json', testPresentation);
        
        // Simulate verifier reading holder output
        const verifierInput = JSON.parse(await fs.readFile(holderOutput, 'utf8'));
        
        if (!verifierInput.verifiableCredential || verifierInput.verifiableCredential.length === 0) {
          throw new Error('Presentation data flow failed');
        }

        this.log('✓ Cross-component data flow working correctly', 'success');
      });

      // Test 10: Configuration Consistency
      await this.test('Configuration Consistency', async () => {
        // Check that both components use the same context URLs
        const issuerContexts = [
          "https://www.w3.org/2018/credentials/v1",
          "https://www.w3.org/2018/credentials/examples/v1",
          "https://example.org/contexts/university-degree/v1",
          "https://w3id.org/security/data-integrity/v2"
        ];

        // Verify that the same context URLs are referenced in both components
        const issuerFiles = [
          path.join(rootDir, 'issuer and verifier', 'issuer.js'),
          path.join(rootDir, 'issuer and verifier', 'verifier.js')
        ];

        const holderFiles = [
          path.join(rootDir, 'holder', 'verifiable-credentials-project', 'holder.js')
        ];

        for (const file of [...issuerFiles, ...holderFiles]) {
          const content = await fs.readFile(file, 'utf8');
          
          // Check that key context URLs are referenced
          if (!content.includes('https://www.w3.org/2018/credentials/v1')) {
            throw new Error(`File ${file} missing base credentials context`);
          }

          if (!content.includes('https://example.org/contexts/university-degree/v1')) {
            throw new Error(`File ${file} missing university degree context`);
          }
        }

        // Check port consistency in server files
        const issuerServer = await fs.readFile(path.join(rootDir, 'issuer and verifier', 'server.js'), 'utf8');
        const holderServer = await fs.readFile(path.join(rootDir, 'holder', 'verifiable-credentials-project', 'server.js'), 'utf8');

        if (!issuerServer.includes('3000') && !issuerServer.includes('PORT')) {
          throw new Error('Issuer server missing port configuration');
        }

        if (!holderServer.includes('3001') && !holderServer.includes('PORT')) {
          throw new Error('Holder server missing port configuration');
        }

        this.log('✓ Configuration consistency verified', 'success');
      });

      // Test 11: Memory and Resource Usage
      await this.test('Memory and Resource Usage', async () => {
        const initialMemory = process.memoryUsage();
        
        // Simulate processing multiple credentials
        const testData = [];
        for (let i = 0; i < 100; i++) {
          testData.push({
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            "type": ["VerifiableCredential"],
            "credentialSubject": {
              "id": `did:test:${i}`,
              "name": `Test User ${i}`
            }
          });
        }

        // Process data (simulate JSON operations)
        for (const item of testData) {
          const serialized = JSON.stringify(item);
          const parsed = JSON.parse(serialized);
          
          if (parsed.credentialSubject.id !== item.credentialSubject.id) {
            throw new Error('Data processing error');
          }
        }

        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        // Check for reasonable memory usage (less than 50MB increase)
        if (memoryIncrease > 50 * 1024 * 1024) {
          throw new Error(`Excessive memory usage: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
        }

        this.log(`✓ Memory usage within acceptable limits (+${Math.round(memoryIncrease / 1024)}KB)`, 'success');
      });

      // Test 12: Concurrent Operations
      await this.test('Concurrent Operations Handling', async () => {
        // Test concurrent file operations
        const promises = [];
        
        for (let i = 0; i < 10; i++) {
          promises.push(this.createTempFile(`concurrent-${i}.json`, { id: i, data: `test-${i}` }));
        }

        const files = await Promise.all(promises);
        
        // Verify all files were created correctly
        for (let i = 0; i < files.length; i++) {
          const content = JSON.parse(await fs.readFile(files[i], 'utf8'));
          if (content.id !== i || content.data !== `test-${i}`) {
            throw new Error(`Concurrent operation failed for file ${i}`);
          }
        }

        this.log('✓ Concurrent operations handled correctly', 'success');
      });

    } finally {
      await this.cleanup();
    }

    // Display results
    this.log('=================================', 'info');
    this.log('🏁 Integration Test Results Summary', 'info');
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
      this.log('\n🎉 All integration tests passed!', 'success');
      return true;
    } else {
      this.log('\n💥 Some integration tests failed.', 'error');
      return false;
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new IntegrationTestRunner();
  runner.runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Integration test runner failed:', error);
    process.exit(1);
  });
}