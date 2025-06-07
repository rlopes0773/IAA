# Testing Guide - Verifiable Credentials Project

This guide explains how to run comprehensive tests for your Verifiable Credentials implementation.

## Test Suite Overview

The test suite includes four types of tests:

1. **Unit Tests** - Test individual components and functions
2. **Integration Tests** - Test component integration and file operations
3. **API Tests** - Test HTTP endpoints with running servers
4. **Complete Flow Tests** - Test the entire VC workflow end-to-end

## Prerequisites

- Node.js 18+
- npm
- All project dependencies installed

## Quick Start

### 1. Setup Test Environment

```bash
# Make the test runner executable
chmod +x run-tests.sh

# Install all dependencies and run all tests
./run-tests.sh
```

### 2. Run Specific Test Suites

```bash
# Run only unit tests
./run-tests.sh --unit

# Run only integration tests  
./run-tests.sh --integration

# Run only API tests
./run-tests.sh --api

# Run only complete flow tests
./run-tests.sh --flow
```

### 3. Individual Test Commands

```bash
# Run individual test files directly
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests  
npm run test:api          # API tests
npm run test              # Complete flow tests

# Run all tests
npm run test:all
```

## Test Files Setup

Create a `tests/` directory in your project root and add these test files:

```
tests/
├── unit-tests.js           # Component validation tests
├── integration-test.js     # Component integration tests
├── api-test.js            # HTTP API endpoint tests
└── complete-flow-test.js  # End-to-end workflow tests
```

## Test Scenarios Covered

### Unit Tests
- ✅ Credential structure validation
- ✅ Presentation structure validation  
- ✅ DID format validation
- ✅ Date format validation
- ✅ Grade validation logic
- ✅ Key generation testing
- ✅ Context file validation
- ✅ Challenge/domain validation
- ✅ Proof structure validation
- ✅ Error detection testing

### Integration Tests
- ✅ Directory structure validation
- ✅ Package.json file validation
- ✅ Context file consistency
- ✅ Dependencies installation check
- ✅ File I/O operations
- ✅ Script execution integration
- ✅ Environment variables
- ✅ Error handling integration
- ✅ Cross-component data flow
- ✅ Configuration consistency
- ✅ Memory usage monitoring
- ✅ Concurrent operations

### API Tests
- ✅ Server startup and health checks
- ✅ Credential issuance via API
- ✅ Presentation creation via API
- ✅ Presentation verification via API
- ✅ Invalid data rejection
- ✅ Missing field validation
- ✅ Wrong challenge/domain handling
- ✅ File access API testing
- ✅ Context loading API
- ✅ Error response validation

### Complete Flow Tests
- ✅ End-to-end credential issuance
- ✅ Credential copying between components
- ✅ Presentation creation with challenge/domain
- ✅ Presentation verification
- ✅ Invalid challenge rejection
- ✅ Invalid domain rejection
- ✅ File system integration
- ✅ Environment variable handling
- ✅ Data integrity validation
- ✅ Cryptographic operations

## Expected Test Data Flow

```
1. Issue Credential (Issuer)
   ├── Input: Student data
   ├── Process: Sign with ECDSA P-256
   └── Output: vc.json

2. Copy to Holder
   ├── Input: vc.json from issuer
   └── Output: vc.json in holder directory

3. Create Presentation (Holder)
   ├── Input: vc.json + challenge + domain
   ├── Process: Create VP with holder DID
   └── Output: vp.json + vpEcdsaKeyPair.json

4. Copy to Verifier
   ├── Input: vp.json from holder
   └── Output: temp_vp.json in verifier

5. Verify Presentation (Verifier)
   ├── Input: temp_vp.json + challenge + domain
   ├── Process: Verify signatures and challenge/domain
   └── Output: Verification result (true/false)
```

## Test Data Examples

### Test Credential Data
```json
{
  "studentId": "did:student:test123456789",
  "studentName": "Maria Test Silva", 
  "degreeName": "Mestrado em Cibersegurança - Teste",
  "finalGrade": 18.5,
  "graduationDate": "2025-06-07",
  "institution": "Universidade de Aveiro - Teste"
}
```

### Test Presentation Data
```json
{
  "challenge": "test-challenge-123",
  "domain": "https://test.example.com/"
}
```

## Running Tests in CI/CD

### GitHub Actions Example
```yaml
name: Test Verifiable Credentials

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: ./run-tests.sh --install
      - name: Run all tests
        run: ./run-tests.sh
```

## Troubleshooting Tests

### Common Issues

1. **Dependencies Not Installed**
   ```bash
   # Solution: Install dependencies
   ./run-tests.sh --install
   ```

2. **Port Conflicts (API Tests)**
   ```bash
   # Solution: Kill processes using ports 3000/3001
   sudo lsof -ti:3000 | xargs kill -9
   sudo lsof -ti:3001 | xargs kill -9
   ```

3. **File Permission Errors**
   ```bash
   # Solution: Make test runner executable
   chmod +x run-tests.sh
   ```

4. **Context Loading Errors**
   ```bash
   # Solution: Ensure context files exist
   ls "issuer and verifier/contexts/"
   ls "holder/verifiable-credentials-project/contexts/"
   ```

5. **Memory/Timeout Issues**
   ```bash
   # Solution: Increase timeout or run tests individually
   ./run-tests.sh --unit
   ./run-tests.sh --integration
   ```

6. **Node.js Version Issues**
   ```bash
   # Solution: Upgrade to Node.js 18+
   node --version  # Check current version
   # Install Node.js 18+ from nodejs.org
   ```

### Debug Mode

To run tests with detailed output:

```bash
# Set debug environment variable
DEBUG=* ./run-tests.sh

# Or run individual tests with more verbose output
node --trace-warnings tests/complete-flow-test.js
```

### Test Isolation

Each test suite is designed to be independent:

```bash
# Clean up before running specific tests
./run-tests.sh --cleanup
./run-tests.sh --unit --no-cleanup
```

## Test Coverage

### What's Tested
- ✅ W3C VC Data Model compliance
- ✅ JSON-LD context loading
- ✅ ECDSA P-256 cryptographic operations
- ✅ DID:key method implementation
- ✅ Challenge-response authentication
- ✅ Selective disclosure capability
- ✅ Cross-component data integrity
- ✅ Error handling and validation
- ✅ HTTP API endpoints
- ✅ File system operations
- ✅ Environment configuration
- ✅ Memory and performance

### What's Not Tested (Future Enhancements)
- ❌ Network communication with real external services
- ❌ Database persistence (current implementation uses files)
- ❌ Advanced eIDAS 2.0 compliance features
- ❌ Zero-knowledge proofs implementation
- ❌ Blockchain integration
- ❌ Mobile app compatibility
- ❌ Browser extension functionality
- ❌ Load testing with high concurrent users
- ❌ Security penetration testing

## Performance Benchmarks

Expected test execution times:

| Test Suite | Duration | Description |
|------------|----------|-------------|
| Unit Tests | ~5-10s | Fast component validation |
| Integration Tests | ~10-20s | File operations and configuration |
| API Tests | ~30-60s | Includes server startup/shutdown |
| Complete Flow Tests | ~30-45s | End-to-end workflow testing |
| **Total** | **~1-2 minutes** | All tests combined |

## Continuous Integration

### Pre-commit Hooks

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Running tests before commit..."
./run-tests.sh --unit --integration
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
```

### Automated Testing Schedule

Recommended CI/CD schedule:

- **On every commit**: Unit + Integration tests
- **On pull requests**: All tests
- **Nightly builds**: All tests + performance monitoring
- **Before releases**: All tests + manual validation

## Test Reporting

### Console Output

Tests provide colored, real-time output:

```
🚀 Starting Complete Flow Test Suite
=====================================
[2025-06-07T12:00:00.000Z] Testing: Issue Verifiable Credential
✅ PASSED: Issue Verifiable Credential
[2025-06-07T12:00:05.000Z] Testing: Create Verifiable Presentation  
✅ PASSED: Create Verifiable Presentation
...
🎉 All tests passed! The VC flow is working correctly.
```

### Exit Codes

- `0` - All tests passed
- `1` - Some tests failed
- `2` - Test setup/configuration error

### Log Files

Test logs are automatically cleaned up, but can be preserved:

```bash
# Run tests with log preservation
./run-tests.sh --no-cleanup 2>&1 | tee test-results.log
```

## Manual Testing Checklist

For manual validation beyond automated tests:

### 1. Visual Interface Testing
- [ ] Open http://localhost:3000 (Issuer/Verifier interface)
- [ ] Open http://localhost:3001 (Holder/Wallet interface)
- [ ] Test form validation and user interactions
- [ ] Verify JSON display formatting
- [ ] Test file upload/download functionality

### 2. Browser Compatibility
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### 3. Error Scenarios
- [ ] Invalid JSON input
- [ ] Missing required fields
- [ ] Network disconnection
- [ ] Server crashes
- [ ] File corruption

### 4. Security Testing
- [ ] XSS prevention in web interfaces
- [ ] Input sanitization
- [ ] Cryptographic key security
- [ ] Challenge/domain validation
- [ ] Proof verification accuracy

## Test Maintenance

### Adding New Tests

1. **Create test function**:
```javascript
await this.test('New Feature Test', async () => {
    // Test implementation
    this.assertTrue(condition, 'Error message');
});
```

2. **Update test documentation**
3. **Run existing tests to ensure no regression**
4. **Update CI/CD pipeline if needed**

### Test Data Updates

When updating test data:

1. Update all relevant test files
2. Ensure consistency across test suites
3. Verify backwards compatibility
4. Update documentation examples

## Support and Debugging

### Getting Help

1. **Check test output** for specific error messages
2. **Review this documentation** for common solutions
3. **Run individual test suites** to isolate issues
4. **Check Node.js and npm versions**
5. **Verify project structure** matches expected layout

### Reporting Issues

When reporting test failures, include:

- Node.js version (`node --version`)
- npm version (`npm --version`)
- Operating system
- Complete test output
- Steps to reproduce
- Expected vs actual behavior

## Advanced Testing Features

### Custom Test Configurations

Create `test-config.json` for custom settings:

```json
{
  "timeout": 60000,
  "serverPorts": {
    "issuer": 3000,
    "holder": 3001
  },
  "testData": {
    "institution": "Custom Test University",
    "domain": "https://custom-test.example.com/"
  }
}
```

### Performance Monitoring

Monitor test performance over time:

```bash
# Run with timing
time ./run-tests.sh

# Monitor memory usage
/usr/bin/time -v ./run-tests.sh
```

### Parallel Test Execution

For faster testing with multiple CPU cores:

```bash
# Run test suites in parallel (advanced)
./run-tests.sh --unit & 
./run-tests.sh --integration &
wait
```

---

## Summary

The test suite provides comprehensive coverage of your Verifiable Credentials implementation, ensuring:

- ✅ **Functional correctness** of all components
- ✅ **Integration reliability** between systems
- ✅ **API endpoint validation** 
- ✅ **End-to-end workflow verification**
- ✅ **Error handling robustness**
- ✅ **Performance monitoring**

Run `./run-tests.sh` to execute all tests and verify your implementation is working correctly!