#!/bin/bash

# Test Runner Script for Verifiable Credentials Project
# This script runs all test suites and provides a comprehensive test report

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Function to print section headers
print_header() {
    echo
    print_color $CYAN "=================================="
    print_color $CYAN "$1"
    print_color $CYAN "=================================="
    echo
}

# Function to check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_color $RED "❌ Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_color $RED "❌ Node.js version 18+ required. Current version: $(node --version)"
        exit 1
    fi
    
    print_color $GREEN "✅ Node.js $(node --version) detected"
}

# Function to check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_color $RED "❌ npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    print_color $GREEN "✅ npm $(npm --version) detected"
}

# Function to install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    # Install root dependencies if package.json exists
    if [ -f "package.json" ]; then
        print_color $BLUE "Installing root dependencies..."
        npm install
    fi
    
    # Install issuer/verifier dependencies
    if [ -d "issuer and verifier" ]; then
        print_color $BLUE "Installing issuer/verifier dependencies..."
        cd "issuer and verifier"
        npm install
        cd ..
    fi
    
    # Install holder dependencies
    if [ -d "holder/verifiable-credentials-project" ]; then
        print_color $BLUE "Installing holder dependencies..."
        cd "holder/verifiable-credentials-project"
        npm install
        cd ../..
    fi
    
    print_color $GREEN "✅ All dependencies installed"
}

# Function to run a single test suite
run_test_suite() {
    local test_name="$1"
    local test_file="$2"
    local description="$3"
    
    print_color $BLUE "Running $description..."
    
    if [ -f "$test_file" ]; then
        if timeout 300 node "$test_file"; then
            print_color $GREEN "✅ $test_name PASSED"
            return 0
        else
            print_color $RED "❌ $test_name FAILED"
            return 1
        fi
    else
        print_color $YELLOW "⚠️  $test_name SKIPPED (file not found: $test_file)"
        return 0
    fi
}

# Function to create test directory if it doesn't exist
setup_test_directory() {
    if [ ! -d "tests" ]; then
        print_color $YELLOW "⚠️  Tests directory not found. Creating tests directory..."
        mkdir -p tests
        print_color $BLUE "Please add the test files to the tests/ directory and run again."
        exit 1
    fi
}

# Function to clean up test artifacts
cleanup_test_artifacts() {
    print_color $BLUE "Cleaning up test artifacts..."
    
    # Remove temporary test files
    find . -name "*.test.json" -type f -delete 2>/dev/null || true
    find . -name "temp_*.json" -type f -delete 2>/dev/null || true
    
    # Remove test-generated VCs and VPs (but keep examples)
    find "issuer and verifier" -name "vc.json" -type f -delete 2>/dev/null || true
    find "issuer and verifier" -name "credential.json" -type f -delete 2>/dev/null || true
    find "issuer and verifier" -name "temp_vp.json" -type f -delete 2>/dev/null || true
    
    find "holder/verifiable-credentials-project" -name "vp.json" -type f -delete 2>/dev/null || true
    find "holder/verifiable-credentials-project" -name "vpEcdsaKeyPair.json" -type f -delete 2>/dev/null || true
    
    # Remove test temp directories
    rm -rf tests/temp 2>/dev/null || true
    
    print_color $GREEN "✅ Test artifacts cleaned up"
}

# Function to generate test report
generate_test_report() {
    local total_tests=$1
    local passed_tests=$2
    local failed_tests=$3
    local skipped_tests=$4
    
    print_header "TEST RESULTS SUMMARY"
    
    print_color $BLUE "Total Test Suites: $total_tests"
    print_color $GREEN "Passed: $passed_tests"
    print_color $RED "Failed: $failed_tests"
    print_color $YELLOW "Skipped: $skipped_tests"
    
    local success_rate=0
    if [ $total_tests -gt 0 ]; then
        success_rate=$((passed_tests * 100 / total_tests))
    fi
    
    print_color $CYAN "Success Rate: ${success_rate}%"
    
    if [ $failed_tests -eq 0 ]; then
        print_color $GREEN "🎉 ALL TESTS PASSED!"
        return 0
    else
        print_color $RED "💥 SOME TESTS FAILED!"
        return 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -i, --install       Install dependencies only"
    echo "  -c, --cleanup       Clean up test artifacts only"
    echo "  -u, --unit          Run unit tests only"
    echo "  -t, --integration   Run integration tests only"
    echo "  -a, --api           Run API tests only"
    echo "  -f, --flow          Run complete flow tests only"
    echo "  --no-install        Skip dependency installation"
    echo "  --no-cleanup        Skip cleanup after tests"
    echo
    echo "Default: Run all tests with dependency installation and cleanup"
}

# Main function
main() {
    local run_unit=true
    local run_integration=true
    local run_api=true
    local run_flow=true
    local install_deps=true
    local cleanup_after=true
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -i|--install)
                check_node
                check_npm
                install_dependencies
                exit 0
                ;;
            -c|--cleanup)
                cleanup_test_artifacts
                exit 0
                ;;
            -u|--unit)
                run_unit=true
                run_integration=false
                run_api=false
                run_flow=false
                ;;
            -t|--integration)
                run_unit=false
                run_integration=true
                run_api=false
                run_flow=false
                ;;
            -a|--api)
                run_unit=false
                run_integration=false
                run_api=true
                run_flow=false
                ;;
            -f|--flow)
                run_unit=false
                run_integration=false
                run_api=false
                run_flow=true
                ;;
            --no-install)
                install_deps=false
                ;;
            --no-cleanup)
                cleanup_after=false
                ;;
            *)
                print_color $RED "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
        shift
    done
    
    print_header "Verifiable Credentials Test Suite"
    print_color $BLUE "Starting comprehensive test execution..."
    
    # Check prerequisites
    check_node
    check_npm
    
    # Install dependencies if requested
    if [ "$install_deps" = true ]; then
        install_dependencies
    fi
    
    # Setup test environment
    setup_test_directory
    
    # Clean up before starting
    if [ "$cleanup_after" = true ]; then
        cleanup_test_artifacts
    fi
    
    # Track test results
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    local skipped_tests=0
    
    # Run test suites
    print_header "Executing Test Suites"
    
    if [ "$run_unit" = true ]; then
        ((total_tests++))
        if run_test_suite "Unit Tests" "tests/unit-tests.js" "Unit Tests - Component Validation"; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
    fi
    
    if [ "$run_integration" = true ]; then
        ((total_tests++))
        if run_test_suite "Integration Tests" "tests/integration-test.js" "Integration Tests - Component Integration"; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
    fi
    
    if [ "$run_api" = true ]; then
        ((total_tests++))
        if run_test_suite "API Tests" "tests/api-test.js" "API Tests - HTTP Endpoint Testing"; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
    fi
    
    if [ "$run_flow" = true ]; then
        ((total_tests++))
        if run_test_suite "Complete Flow Tests" "tests/complete-flow-test.js" "Complete Flow Tests - End-to-End Testing"; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
    fi
    
    # Clean up after tests
    if [ "$cleanup_after" = true ]; then
        cleanup_test_artifacts
    fi
    
    # Generate final report
    if generate_test_report $total_tests $passed_tests $failed_tests $skipped_tests; then
        exit 0
    else
        exit 1
    fi
}

# Run main function with all arguments
main "$@"