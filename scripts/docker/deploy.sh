#!/bin/bash
# ==============================================================================
# LYRICLESS - DOCKER DEPLOYMENT SCRIPT
# ==============================================================================
# Production deployment script with health checks and rollback capabilities

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="lyricless"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.docker"
BACKUP_DIR="./backups"

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

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check Docker Compose file
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Validate Compose file
    if ! docker compose -f "$COMPOSE_FILE" config > /dev/null; then
        log_error "Invalid Docker Compose configuration"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning "Environment file not found: $ENV_FILE"
        log_info "Using default environment variables"
    fi
    
    # Check available disk space
    local available_space=$(df . | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 1000000 ]]; then  # Less than ~1GB
        log_warning "Low disk space available: ${available_space}KB"
    fi
    
    # Check if service is already running
    if docker compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        log_info "Service is currently running"
        return 0
    else
        log_info "Service is not running"
        return 1
    fi
}

# Backup current state
backup_state() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup database
    if [[ -d "./data/database" ]]; then
        cp -r "./data/database" "$backup_path/"
        log_success "Database backed up"
    fi
    
    # Backup configuration
    cp "$COMPOSE_FILE" "$backup_path/" || true
    cp "$ENV_FILE" "$backup_path/" || true
    
    # Export current container image
    if docker images "${SERVICE_NAME}:latest" --format "{{.ID}}" | grep -q .; then
        docker save "${SERVICE_NAME}:latest" > "$backup_path/image.tar"
        log_success "Container image backed up"
    fi
    
    echo "$backup_name" > "$BACKUP_DIR/latest"
    log_success "Backup created: $backup_path"
}

# Deploy service
deploy_service() {
    local deployment_mode=${1:-rolling}
    
    log_info "Starting deployment (mode: $deployment_mode)..."
    
    # Set environment file
    export COMPOSE_FILE="$COMPOSE_FILE"
    if [[ -f "$ENV_FILE" ]]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    fi
    
    case "$deployment_mode" in
        "rolling")
            # Rolling update
            log_info "Performing rolling update..."
            docker compose -f "$COMPOSE_FILE" up -d --force-recreate
            ;;
        "blue-green")
            # Blue-green deployment (if supported)
            log_info "Performing blue-green deployment..."
            log_warning "Blue-green deployment not implemented yet"
            docker compose -f "$COMPOSE_FILE" up -d --force-recreate
            ;;
        "fresh")
            # Fresh deployment
            log_info "Performing fresh deployment..."
            docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans
            docker compose -f "$COMPOSE_FILE" up -d
            ;;
        *)
            log_error "Unknown deployment mode: $deployment_mode"
            exit 1
            ;;
    esac
    
    log_success "Deployment initiated"
}

# Health checks
health_checks() {
    log_info "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    local health_check_url="http://localhost:3000/api/test"
    
    log_info "Waiting for service to be ready..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f "$health_check_url" &> /dev/null; then
            log_success "Health check passed (attempt $attempt)"
            return 0
        else
            log_info "Health check failed (attempt $attempt/$max_attempts)"
            sleep 5
            ((attempt++))
        fi
    done
    
    log_error "Health checks failed after $max_attempts attempts"
    return 1
}

# Post-deployment verification
post_deployment_verification() {
    log_info "Running post-deployment verification..."
    
    # Check service status
    local status=$(docker compose -f "$COMPOSE_FILE" ps --format "json" | jq -r '.[0].State' 2>/dev/null || echo "unknown")
    
    if [[ "$status" == "running" ]]; then
        log_success "Service is running"
    else
        log_error "Service is not in running state: $status"
        return 1
    fi
    
    # Check logs for errors
    local error_count=$(docker compose -f "$COMPOSE_FILE" logs --tail=50 | grep -i "error" | wc -l)
    if [[ $error_count -gt 0 ]]; then
        log_warning "Found $error_count error(s) in recent logs"
        docker compose -f "$COMPOSE_FILE" logs --tail=10
    fi
    
    # Verify WebAssembly support
    log_info "Checking WebAssembly support..."
    if curl -f "http://localhost:3000" | grep -q "FFmpeg" &> /dev/null; then
        log_success "WebAssembly support detected"
    else
        log_warning "WebAssembly support verification failed"
    fi
    
    log_success "Post-deployment verification completed"
}

# Rollback function
rollback() {
    log_warning "Starting rollback..."
    
    if [[ ! -f "$BACKUP_DIR/latest" ]]; then
        log_error "No backup found for rollback"
        exit 1
    fi
    
    local backup_name=$(cat "$BACKUP_DIR/latest")
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log_info "Rolling back to: $backup_name"
    
    # Stop current service
    docker compose -f "$COMPOSE_FILE" down
    
    # Restore database
    if [[ -d "$backup_path/database" ]]; then
        rm -rf "./data/database"
        cp -r "$backup_path/database" "./data/"
        log_success "Database restored"
    fi
    
    # Restore image
    if [[ -f "$backup_path/image.tar" ]]; then
        docker load < "$backup_path/image.tar"
        log_success "Container image restored"
    fi
    
    # Start service
    docker compose -f "$COMPOSE_FILE" up -d
    
    log_success "Rollback completed"
}

# Cleanup function
cleanup() {
    log_info "Running cleanup..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    # Clean old backups (keep last 5)
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup_*" | sort -r | tail -n +6 | xargs rm -rf
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    local action=${1:-deploy}
    local deployment_mode=${2:-rolling}
    
    case "$action" in
        "deploy")
            log_info "Starting deployment process..."
            
            # Check if currently running
            if pre_deployment_checks; then
                backup_state
            fi
            
            deploy_service "$deployment_mode"
            
            if health_checks && post_deployment_verification; then
                log_success "Deployment completed successfully!"
                cleanup
            else
                log_error "Deployment failed"
                log_info "Consider running rollback: $0 rollback"
                exit 1
            fi
            ;;
        "rollback")
            rollback
            if health_checks; then
                log_success "Rollback completed successfully!"
            else
                log_error "Rollback failed"
                exit 1
            fi
            ;;
        "status")
            docker compose -f "$COMPOSE_FILE" ps
            docker compose -f "$COMPOSE_FILE" logs --tail=20
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 [deploy|rollback|status|cleanup] [rolling|blue-green|fresh]"
            echo ""
            echo "Actions:"
            echo "  deploy   - Deploy the application (default)"
            echo "  rollback - Rollback to previous version"
            echo "  status   - Show current status"
            echo "  cleanup  - Clean up unused resources"
            echo ""
            echo "Deployment modes (for deploy action):"
            echo "  rolling    - Rolling update (default)"
            echo "  blue-green - Blue-green deployment"
            echo "  fresh      - Fresh deployment (removes all data)"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"