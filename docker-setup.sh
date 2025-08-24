#!/bin/bash

# ==============================================================================
# LYRICLESS - DOCKER SETUP AND TEST SCRIPT
# ==============================================================================
# Complete Docker setup for client-side video downloader

set -e

echo "🚀 Lyricless Docker Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    fi
    
    print_success "Docker is running"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p data/database
    mkdir -p data/cache
    mkdir -p nginx/ssl
    
    print_success "Directories created"
}

# Build Docker images
build_images() {
    print_status "Building Docker images..."
    
    print_status "Building production image..."
    docker build -t lyricless:latest .
    
    print_status "Building development image..."
    docker build -t lyricless:dev --target dev-deps .
    
    print_success "Docker images built successfully"
}

# Test production container
test_production() {
    print_status "Testing production container..."
    
    # Stop any running containers
    docker compose down 2>/dev/null || true
    
    # Start production container
    print_status "Starting production container..."
    docker compose up -d
    
    # Wait for container to start
    print_status "Waiting for application to start..."
    sleep 30
    
    # Check if container is running
    if docker compose ps --format json | jq -e '.[] | select(.Name == "lyricless-app") | select(.State == "running")' > /dev/null; then
        print_success "Production container is running"
        
        # Test health endpoint
        if curl -f http://localhost:3000/api/test &> /dev/null; then
            print_success "Health check passed"
        else
            print_warning "Health check failed - application may still be starting"
        fi
        
        print_status "Production logs (last 20 lines):"
        docker compose logs --tail=20 lyricless
        
    else
        print_error "Production container failed to start"
        docker compose logs lyricless
        return 1
    fi
}

# Test development container
test_development() {
    print_status "Testing development container..."
    
    # Stop production containers
    docker compose down
    
    # Start development container
    print_status "Starting development container..."
    docker compose -f docker-compose.dev.yml up -d
    
    # Wait for container to start
    print_status "Waiting for development server to start..."
    sleep 45
    
    # Check if container is running
    if docker compose -f docker-compose.dev.yml ps --format json | jq -e '.[] | select(.Name == "lyricless-dev") | select(.State == "running")' > /dev/null; then
        print_success "Development container is running"
        
        # Test development server
        if curl -f http://localhost:3000/api/test &> /dev/null; then
            print_success "Development server health check passed"
        else
            print_warning "Development server health check failed - may still be starting"
        fi
        
        print_status "Development logs (last 20 lines):"
        docker compose -f docker-compose.dev.yml logs --tail=20 lyricless-dev
        
    else
        print_error "Development container failed to start"
        docker compose -f docker-compose.dev.yml logs lyricless-dev
        return 1
    fi
}

# Test WebAssembly functionality
test_webassembly() {
    print_status "Testing WebAssembly functionality..."
    
    # Create a test script to verify WebAssembly headers
    cat << 'EOF' > test-wasm.js
const { exec } = require('child_process');
const http = require('http');

// Test CORS headers for WebAssembly
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/proxy/cors',
  method: 'GET',
  headers: {
    'Origin': 'http://localhost:3000'
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('CORS Headers:');
  console.log('Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
  console.log('Access-Control-Allow-Methods:', res.headers['access-control-allow-methods']);
  
  if (res.headers['access-control-allow-origin']) {
    console.log('✅ CORS headers configured for WebAssembly');
    process.exit(0);
  } else {
    console.log('❌ CORS headers missing');
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.log('❌ Request failed:', err.message);
  process.exit(1);
});

req.end();
EOF
    
    if node test-wasm.js; then
        print_success "WebAssembly CORS configuration verified"
    else
        print_warning "WebAssembly CORS configuration needs attention"
    fi
    
    rm test-wasm.js
}

# Cleanup function
cleanup() {
    print_status "Cleaning up test containers..."
    docker compose down 2>/dev/null || true
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true
    print_success "Cleanup completed"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --build-only    Only build Docker images"
    echo "  --test-prod     Only test production container"
    echo "  --test-dev      Only test development container"
    echo "  --cleanup       Only cleanup containers"
    echo "  --help          Show this help message"
    echo ""
    echo "Without options, runs complete setup and test suite"
}

# Main execution
main() {
    case "${1:-}" in
        --build-only)
            check_docker
            create_directories
            build_images
            ;;
        --test-prod)
            check_docker
            test_production
            ;;
        --test-dev)
            check_docker
            test_development
            ;;
        --cleanup)
            cleanup
            ;;
        --help)
            show_usage
            ;;
        "")
            # Full setup and test
            check_docker
            create_directories
            build_images
            test_production
            test_webassembly
            test_development
            cleanup
            
            print_success "🎉 Docker setup completed successfully!"
            print_status "Next steps:"
            echo "  • Production: docker compose up -d"
            echo "  • Development: docker compose -f docker-compose.dev.yml up -d"
            echo "  • With Prisma Studio: docker compose -f docker-compose.dev.yml --profile tools up -d"
            echo "  • View logs: docker compose logs -f lyricless"
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"