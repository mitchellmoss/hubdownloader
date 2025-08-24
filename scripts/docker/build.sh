#!/bin/bash
# ==============================================================================
# LYRICLESS - DOCKER BUILD SCRIPT
# ==============================================================================
# Production-ready build script with optimization and security checks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="lyricless"
BUILD_TARGET="runtime"
DOCKERFILE="Dockerfile.optimized"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    if [[ ! -f "$DOCKERFILE" ]]; then
        log_error "Dockerfile not found: $DOCKERFILE"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Security scan
security_scan() {
    log_info "Running security scans..."
    
    # Check for common security issues in Dockerfile
    if grep -q "ADD.*http" "$DOCKERFILE"; then
        log_warning "Dockerfile uses ADD with URLs - consider using COPY instead"
    fi
    
    if grep -q "USER root" "$DOCKERFILE"; then
        log_warning "Dockerfile switches to root user - ensure this is necessary"
    fi
    
    # Scan for secrets in environment files
    if find . -name "*.env*" -exec grep -l "password\|secret\|key" {} \; | grep -v ".gitignore"; then
        log_warning "Potential secrets found in environment files"
    fi
    
    log_success "Security scan completed"
}

# Build image
build_image() {
    local tag=${1:-latest}
    
    log_info "Building Docker image: ${IMAGE_NAME}:${tag}"
    log_info "Target: ${BUILD_TARGET}"
    log_info "Dockerfile: ${DOCKERFILE}"
    
    # Build with BuildKit for better performance
    DOCKER_BUILDKIT=1 docker build \
        --target "$BUILD_TARGET" \
        --tag "${IMAGE_NAME}:${tag}" \
        --file "$DOCKERFILE" \
        --progress=plain \
        --no-cache \
        .
    
    if [[ $? -eq 0 ]]; then
        log_success "Docker image built successfully: ${IMAGE_NAME}:${tag}"
    else
        log_error "Docker image build failed"
        exit 1
    fi
}

# Optimize image
optimize_image() {
    local tag=${1:-latest}
    
    log_info "Optimizing Docker image..."
    
    # Get image size
    local size=$(docker images "${IMAGE_NAME}:${tag}" --format "{{.Size}}")
    log_info "Image size: $size"
    
    # Check for vulnerabilities if available
    if command -v docker scan &> /dev/null; then
        log_info "Running vulnerability scan..."
        docker scan "${IMAGE_NAME}:${tag}" || log_warning "Vulnerability scan failed or unavailable"
    fi
    
    # Image history
    log_info "Image layers:"
    docker history "${IMAGE_NAME}:${tag}" --no-trunc
    
    log_success "Image optimization completed"
}

# Test image
test_image() {
    local tag=${1:-latest}
    
    log_info "Testing Docker image..."
    
    # Basic functionality test
    if docker run --rm "${IMAGE_NAME}:${tag}" node --version; then
        log_success "Node.js runtime test passed"
    else
        log_error "Node.js runtime test failed"
        exit 1
    fi
    
    # Health check test
    log_info "Starting container for health check..."
    local container_id=$(docker run -d -p 3001:3000 "${IMAGE_NAME}:${tag}")
    
    # Wait for startup
    sleep 10
    
    # Health check
    if curl -f http://localhost:3001/api/test &> /dev/null; then
        log_success "Health check passed"
    else
        log_warning "Health check failed - check application startup"
    fi
    
    # Cleanup
    docker stop "$container_id" &> /dev/null || true
    docker rm "$container_id" &> /dev/null || true
    
    log_success "Image testing completed"
}

# Main execution
main() {
    local tag=${1:-latest}
    local skip_tests=${2:-false}
    
    log_info "Starting Docker build process..."
    log_info "Tag: $tag"
    
    check_prerequisites
    security_scan
    build_image "$tag"
    optimize_image "$tag"
    
    if [[ "$skip_tests" != "true" ]]; then
        test_image "$tag"
    fi
    
    log_success "Docker build process completed successfully!"
    log_info "Run with: docker run -p 3000:3000 ${IMAGE_NAME}:${tag}"
    log_info "Or use: docker compose up"
}

# Script usage
usage() {
    echo "Usage: $0 [tag] [skip-tests]"
    echo "  tag:        Docker image tag (default: latest)"
    echo "  skip-tests: Skip image testing (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Build with 'latest' tag and run tests"
    echo "  $0 v1.0.0            # Build with 'v1.0.0' tag and run tests"
    echo "  $0 latest true       # Build with 'latest' tag and skip tests"
}

# Handle script arguments
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
fi

# Execute main function
main "${1:-latest}" "${2:-false}"