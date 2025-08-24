#!/bin/bash
# ==============================================================================
# LYRICLESS - DOCKER SETUP SCRIPT
# ==============================================================================
# Initial setup script for Docker containerization

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    # Data directories
    mkdir -p ./data/database
    mkdir -p ./data/cache
    mkdir -p ./backups
    mkdir -p ./logs
    
    # SSL directory for nginx (if needed)
    mkdir -p ./nginx/ssl
    
    # Temporary directories
    mkdir -p ./tmp/videos
    
    # Set appropriate permissions
    chmod 755 ./data/database ./data/cache ./backups ./logs
    chmod 700 ./nginx/ssl
    
    log_success "Directories created successfully"
}

# Generate SSL certificates (self-signed for development)
generate_ssl_certs() {
    log_info "Generating self-signed SSL certificates for development..."
    
    if [[ ! -f "./nginx/ssl/cert.pem" ]]; then
        openssl req -x509 -newkey rsa:4096 -keyout ./nginx/ssl/key.pem -out ./nginx/ssl/cert.pem \
            -days 365 -nodes -subj "/C=US/ST=Local/L=Local/O=Lyricless/CN=localhost"
        
        chmod 600 ./nginx/ssl/key.pem
        chmod 644 ./nginx/ssl/cert.pem
        
        log_success "SSL certificates generated"
    else
        log_info "SSL certificates already exist"
    fi
}

# Set up environment files
setup_environment() {
    log_info "Setting up environment files..."
    
    # Copy environment templates if they don't exist
    if [[ ! -f ".env.docker" ]]; then
        log_warning ".env.docker not found - please configure production environment"
    fi
    
    if [[ ! -f ".env.docker.dev" ]]; then
        log_warning ".env.docker.dev not found - please configure development environment"
    fi
    
    log_info "Environment files ready"
}

# Initialize database
init_database() {
    log_info "Initializing database..."
    
    # Create database file if it doesn't exist
    if [[ ! -f "./data/database/dev.db" ]]; then
        touch ./data/database/dev.db
        log_success "Database file created"
    else
        log_info "Database file already exists"
    fi
}

# Validate configuration files
validate_config() {
    log_info "Validating configuration files..."
    
    # Check Docker Compose files
    if docker compose -f docker-compose.yml config > /dev/null 2>&1; then
        log_success "Production docker-compose.yml is valid"
    else
        log_error "Production docker-compose.yml has errors"
        return 1
    fi
    
    if docker compose -f docker-compose.dev.yml config > /dev/null 2>&1; then
        log_success "Development docker-compose.dev.yml is valid"
    else
        log_error "Development docker-compose.dev.yml has errors"
        return 1
    fi
    
    # Check Nginx configuration
    if docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t 2>/dev/null; then
        log_success "Nginx configuration is valid"
    else
        log_warning "Nginx configuration validation failed - please check manually"
    fi
}

# Pull base images
pull_base_images() {
    log_info "Pulling base Docker images..."
    
    # Pull Node.js base image
    docker pull node:18-alpine
    
    # Pull Nginx image
    docker pull nginx:alpine
    
    log_success "Base images pulled successfully"
}

# Test setup
test_setup() {
    log_info "Testing Docker setup..."
    
    # Test development build
    log_info "Testing development build..."
    if docker build -f Dockerfile.dev -t lyricless:test-dev . > /dev/null 2>&1; then
        log_success "Development build test passed"
        docker rmi lyricless:test-dev > /dev/null 2>&1 || true
    else
        log_error "Development build test failed"
        return 1
    fi
    
    # Test production build
    log_info "Testing production build..."
    if docker build -f Dockerfile.optimized -t lyricless:test-prod . > /dev/null 2>&1; then
        log_success "Production build test passed"
        docker rmi lyricless:test-prod > /dev/null 2>&1 || true
    else
        log_error "Production build test failed"
        return 1
    fi
    
    log_success "Setup tests completed successfully"
}

# Display helpful information
display_info() {
    log_success "Docker setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo ""
    echo "📦 Development:"
    echo "   docker compose -f docker-compose.dev.yml up -d"
    echo "   Open: http://localhost:3000"
    echo "   Prisma Studio: http://localhost:5555"
    echo ""
    echo "🚀 Production:"
    echo "   ./scripts/docker/build.sh"
    echo "   ./scripts/docker/deploy.sh"
    echo "   Open: http://localhost:3000"
    echo ""
    echo "🔧 Useful commands:"
    echo "   docker compose logs -f                 # View logs"
    echo "   docker compose ps                      # Show status"
    echo "   docker compose exec lyricless sh       # Shell access"
    echo "   ./scripts/docker/deploy.sh status      # Deployment status"
    echo ""
    echo "📁 Important files:"
    echo "   - /Users/mitchellmoss/projects/hubdownloader/docker-compose.yml              # Production config"
    echo "   - /Users/mitchellmoss/projects/hubdownloader/docker-compose.dev.yml         # Development config"
    echo "   - /Users/mitchellmoss/projects/hubdownloader/.env.docker                    # Production environment"
    echo "   - /Users/mitchellmoss/projects/hubdownloader/.env.docker.dev               # Development environment"
    echo "   - /Users/mitchellmoss/projects/hubdownloader/DOCKER.md                     # Documentation"
    echo ""
    echo "⚠️  Remember to:"
    echo "   - Configure environment variables in .env.docker files"
    echo "   - Set up proper SSL certificates for production"
    echo "   - Configure monitoring and backup strategies"
    echo "   - Review security settings before deployment"
}

# Main function
main() {
    log_info "Starting Docker setup for Lyricless..."
    
    check_prerequisites
    create_directories
    generate_ssl_certs
    setup_environment
    init_database
    validate_config
    pull_base_images
    
    if [[ "${1:-}" != "--skip-tests" ]]; then
        test_setup
    fi
    
    display_info
}

# Handle script arguments
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    echo "Usage: $0 [--skip-tests]"
    echo ""
    echo "Options:"
    echo "  --skip-tests    Skip build tests (faster setup)"
    echo "  --help, -h      Show this help message"
    exit 0
fi

# Execute main function
main "$@"