#!/bin/bash
# ==============================================================================
# LYRICLESS - DOCKER DEPLOYMENT SCRIPT
# ==============================================================================
# Automated deployment script for server-side video downloader
# Supports development, staging, and production environments

set -euo pipefail

# ==============================================================================
# Configuration and Variables
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="lyricless"
DEFAULT_ENV="production"
DOCKER_COMPOSE_FILE="docker-compose.production.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# ==============================================================================
# Helper Functions
# ==============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}[LYRICLESS]${NC} $1"
}

# ==============================================================================
# Environment Setup
# ==============================================================================

setup_environment() {
    local env=${1:-$DEFAULT_ENV}
    
    log_header "Setting up $env environment..."
    
    # Create necessary directories
    mkdir -p data downloads logs
    
    # Setup environment file if it doesn't exist
    if [ ! -f ".env.docker" ]; then
        if [ -f ".env.docker.example" ]; then
            log_info "Creating .env.docker from example..."
            cp .env.docker.example .env.docker
            log_warn "Please review and customize .env.docker before proceeding"
            
            # Prompt user to edit
            read -p "Would you like to edit .env.docker now? (y/N): " edit_env
            if [[ $edit_env =~ ^[Yy]$ ]]; then
                ${EDITOR:-nano} .env.docker
            fi
        else
            log_error ".env.docker.example not found!"
            exit 1
        fi
    else
        log_info "Using existing .env.docker"
    fi
    
    # Set permissions
    chmod 755 data downloads logs
    chmod 600 .env.docker
    
    log_success "Environment setup complete"
}

# ==============================================================================
# Docker Operations
# ==============================================================================

build_images() {
    local env=${1:-$DEFAULT_ENV}
    local no_cache=${2:-false}
    
    log_header "Building Docker images for $env environment..."
    
    local build_args=""
    if [ "$no_cache" = "true" ]; then
        build_args="--no-cache"
    fi
    
    case $env in
        "development")
            log_info "Building development image..."
            docker build $build_args -f Dockerfile.development -t $PROJECT_NAME:dev .
            ;;
        "production")
            log_info "Building production image..."
            docker build $build_args -f Dockerfile.production -t $PROJECT_NAME:latest .
            ;;
        *)
            log_error "Unknown environment: $env"
            exit 1
            ;;
    esac
    
    log_success "Docker images built successfully"
}

start_services() {
    local env=${1:-$DEFAULT_ENV}
    local profile=${2:-""}
    
    log_header "Starting services for $env environment..."
    
    local compose_cmd="docker-compose"
    local compose_file=""
    local profile_args=""
    
    case $env in
        "development")
            compose_file="docker-compose.dev.yml"
            if [ ! -f "$compose_file" ]; then
                compose_file="docker-compose.yml"
            fi
            ;;
        "production")
            compose_file="docker-compose.production.yml"
            ;;
        *)
            log_error "Unknown environment: $env"
            exit 1
            ;;
    esac
    
    if [ ! -f "$compose_file" ]; then
        log_error "Docker Compose file not found: $compose_file"
        exit 1
    fi
    
    # Add profile arguments if specified
    if [ -n "$profile" ]; then
        profile_args="--profile $profile"
    fi
    
    log_info "Using Docker Compose file: $compose_file"
    
    # Load environment variables
    if [ -f ".env.docker" ]; then
        set -a
        source .env.docker
        set +a
    fi
    
    # Start services
    $compose_cmd -f $compose_file $profile_args up -d
    
    log_success "Services started successfully"
    
    # Show status
    show_status "$compose_file"
}

stop_services() {
    local compose_file=${1:-$DOCKER_COMPOSE_FILE}
    
    log_header "Stopping services..."
    
    if [ -f "$compose_file" ]; then
        docker-compose -f $compose_file down
        log_success "Services stopped successfully"
    else
        log_warn "Docker Compose file not found: $compose_file"
        # Fallback to stopping all containers with project name
        docker ps -q --filter "name=$PROJECT_NAME" | xargs -r docker stop
    fi
}

show_status() {
    local compose_file=${1:-$DOCKER_COMPOSE_FILE}
    
    log_header "Service Status"
    
    if [ -f "$compose_file" ]; then
        docker-compose -f $compose_file ps
    else
        docker ps --filter "name=$PROJECT_NAME"
    fi
}

show_logs() {
    local service=${1:-""}
    local compose_file=${2:-$DOCKER_COMPOSE_FILE}
    
    log_header "Service Logs"
    
    if [ -f "$compose_file" ]; then
        if [ -n "$service" ]; then
            docker-compose -f $compose_file logs -f $service
        else
            docker-compose -f $compose_file logs -f
        fi
    else
        log_error "Docker Compose file not found: $compose_file"
        exit 1
    fi
}

# ==============================================================================
# Maintenance Operations
# ==============================================================================

cleanup() {
    log_header "Cleaning up Docker resources..."
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    read -p "Remove unused Docker volumes? This may delete data! (y/N): " remove_volumes
    if [[ $remove_volumes =~ ^[Yy]$ ]]; then
        docker volume prune -f
    fi
    
    # Remove unused networks
    docker network prune -f
    
    log_success "Cleanup completed"
}

backup_data() {
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    
    log_header "Creating backup..."
    
    mkdir -p "$backup_dir"
    
    # Backup database
    if [ -d "data" ]; then
        cp -r data "$backup_dir/"
        log_info "Database backed up"
    fi
    
    # Backup configuration
    if [ -f ".env.docker" ]; then
        cp .env.docker "$backup_dir/"
        log_info "Configuration backed up"
    fi
    
    # Create archive
    tar -czf "$backup_dir.tar.gz" "$backup_dir"
    rm -rf "$backup_dir"
    
    log_success "Backup created: $backup_dir.tar.gz"
}

update_services() {
    local env=${1:-$DEFAULT_ENV}
    
    log_header "Updating services..."
    
    # Create backup first
    backup_data
    
    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f docker-compose.production.yml pull
    
    # Rebuild and restart
    build_images "$env"
    stop_services
    start_services "$env"
    
    log_success "Services updated successfully"
}

# ==============================================================================
# Health Checks
# ==============================================================================

health_check() {
    log_header "Performing health checks..."
    
    local healthy=true
    
    # Check if main application is responding
    if curl -f http://localhost:3000/api/test >/dev/null 2>&1; then
        log_success "Application is responding"
    else
        log_error "Application is not responding"
        healthy=false
    fi
    
    # Check Docker containers
    local containers=$(docker ps --filter "name=$PROJECT_NAME" --format "table {{.Names}}\t{{.Status}}")
    if [ -n "$containers" ]; then
        log_info "Running containers:"
        echo "$containers"
    else
        log_warn "No containers found"
        healthy=false
    fi
    
    # Check disk space
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        log_warn "High disk usage: ${disk_usage}%"
    else
        log_info "Disk usage: ${disk_usage}%"
    fi
    
    if [ "$healthy" = true ]; then
        log_success "All health checks passed"
        return 0
    else
        log_error "Some health checks failed"
        return 1
    fi
}

# ==============================================================================
# Usage Information
# ==============================================================================

show_help() {
    cat << EOF
Lyricless Docker Deployment Script

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    setup [ENV]              Setup environment (development|production)
    build [ENV] [--no-cache] Build Docker images
    start [ENV] [PROFILE]    Start services
    stop                     Stop services
    restart [ENV]            Restart services
    status                   Show service status
    logs [SERVICE]           Show service logs
    cleanup                  Clean up Docker resources
    backup                   Backup application data
    update [ENV]             Update services
    health                   Perform health checks
    help                     Show this help message

ENVIRONMENTS:
    development             Development environment with hot reload
    production              Production environment (default)

PROFILES:
    cache                   Include Redis cache service
    monitoring              Include Prometheus and Grafana
    production              All production services

EXAMPLES:
    $0 setup production
    $0 build production --no-cache
    $0 start production
    $0 start production monitoring
    $0 logs lyricless
    $0 health
    $0 update production

ENVIRONMENT FILES:
    .env.docker            Main environment configuration
    .env.docker.example    Example configuration file

For more information, visit: https://github.com/your-repo/lyricless
EOF
}

# ==============================================================================
# Main Script Logic
# ==============================================================================

main() {
    local command=${1:-"help"}
    local env=${2:-$DEFAULT_ENV}
    local option=${3:-""}
    
    cd "$SCRIPT_DIR"
    
    case $command in
        "setup")
            setup_environment "$env"
            ;;
        "build")
            local no_cache=false
            if [ "$option" = "--no-cache" ]; then
                no_cache=true
            fi
            build_images "$env" "$no_cache"
            ;;
        "start")
            start_services "$env" "$option"
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            start_services "$env"
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$env"
            ;;
        "cleanup")
            cleanup
            ;;
        "backup")
            backup_data
            ;;
        "update")
            update_services "$env"
            ;;
        "health")
            health_check
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"