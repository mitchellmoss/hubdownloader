#!/bin/bash
# ==============================================================================
# LYRICLESS - DOCKER ENTRYPOINT SCRIPT
# ==============================================================================
# Handles container initialization, database setup, and health checks
# for the server-side video downloader application

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# ==============================================================================
# Configuration and Environment Setup
# ==============================================================================

# Default values
NODE_ENV="${NODE_ENV:-production}"
DATABASE_URL="${DATABASE_URL:-file:/app/data/database.db}"
TEMP_DIR="${TEMP_DIR:-/app/temp}"
DOWNLOADS_DIR="${DOWNLOADS_DIR:-/app/downloads}"
LOGS_DIR="${LOGS_DIR:-/app/logs}"
CLEANUP_TEMP_FILES="${CLEANUP_TEMP_FILES:-true}"
CLEANUP_INTERVAL="${CLEANUP_INTERVAL:-3600}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Logging Functions
# ==============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOGS_DIR}/startup.log"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOGS_DIR}/startup.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOGS_DIR}/startup.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOGS_DIR}/startup.log"
}

# ==============================================================================
# Directory Setup and Permissions
# ==============================================================================

setup_directories() {
    log_info "Setting up application directories..."
    
    # Create necessary directories
    mkdir -p "${TEMP_DIR}" "${DOWNLOADS_DIR}" "${LOGS_DIR}"
    mkdir -p "/app/data" "/app/.next/cache"
    
    # Set proper permissions
    chmod 755 "${TEMP_DIR}" "${DOWNLOADS_DIR}" "${LOGS_DIR}"
    chmod 755 "/app/data" "/app/.next/cache"
    
    # Create log files
    touch "${LOGS_DIR}/app.log" "${LOGS_DIR}/error.log" "${LOGS_DIR}/startup.log"
    chmod 644 "${LOGS_DIR}"/*.log
    
    log_success "Directories set up successfully"
}

# ==============================================================================
# System Dependencies Verification
# ==============================================================================

verify_dependencies() {
    log_info "Verifying system dependencies..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    else
        log_info "Node.js version: $(node --version)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    else
        log_info "npm version: $(npm --version)"
    fi
    
    # Check Chromium
    if ! command -v chromium-browser &> /dev/null; then
        missing_deps+=("chromium-browser")
    else
        log_info "Chromium installed: $(chromium-browser --version 2>/dev/null || echo 'Version check failed')"
    fi
    
    # Check yt-dlp
    if ! command -v yt-dlp &> /dev/null; then
        missing_deps+=("yt-dlp")
    else
        log_info "yt-dlp version: $(yt-dlp --version)"
    fi
    
    # Check FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        missing_deps+=("ffmpeg")
    else
        log_info "FFmpeg version: $(ffmpeg -version 2>/dev/null | head -n1)"
    fi
    
    # Check Python3
    if ! command -v python3 &> /dev/null; then
        missing_deps+=("python3")
    else
        log_info "Python version: $(python3 --version)"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    log_success "All system dependencies verified"
}

# ==============================================================================
# Database Initialization
# ==============================================================================

setup_database() {
    log_info "Setting up database..."
    
    # Extract directory from DATABASE_URL
    local db_dir
    db_dir=$(dirname "${DATABASE_URL#file:}")
    
    # Create database directory if it doesn't exist
    mkdir -p "${db_dir}"
    
    # Check if database exists
    local db_file="${DATABASE_URL#file:}"
    
    if [ ! -f "${db_file}" ]; then
        log_info "Database file doesn't exist, creating new database..."
        
        # Generate Prisma client
        log_info "Generating Prisma client..."
        npx prisma generate || {
            log_error "Failed to generate Prisma client"
            exit 1
        }
        
        # Push database schema
        log_info "Pushing database schema..."
        npx prisma db push --accept-data-loss || {
            log_error "Failed to push database schema"
            exit 1
        }
        
        log_success "Database created and initialized"
    else
        log_info "Database file exists, checking schema..."
        
        # Generate Prisma client
        npx prisma generate || {
            log_error "Failed to generate Prisma client"
            exit 1
        }
        
        # Optionally run migrations
        if [ "${NODE_ENV}" = "development" ]; then
            log_info "Development mode: Running database migrations..."
            npx prisma db push || log_warn "Database migration failed (continuing anyway)"
        fi
        
        log_success "Database verified"
    fi
}

# ==============================================================================
# Application Health Checks
# ==============================================================================

health_check() {
    log_info "Performing application health checks..."
    
    # Check if Next.js build exists
    if [ ! -f "/app/server.js" ]; then
        log_error "Next.js server.js not found - build may have failed"
        exit 1
    fi
    
    # Check if Prisma client is generated
    if [ ! -d "/app/node_modules/.prisma" ] && [ ! -d "/app/node_modules/@prisma/client" ]; then
        log_error "Prisma client not found - database setup may have failed"
        exit 1
    fi
    
    # Check disk space
    local available_space
    available_space=$(df /app | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [ "${available_space}" -lt "${required_space}" ]; then
        log_warn "Low disk space detected: ${available_space}KB available"
    fi
    
    log_success "Health checks passed"
}

# ==============================================================================
# Cleanup Functions
# ==============================================================================

cleanup_temp_files() {
    if [ "${CLEANUP_TEMP_FILES}" = "true" ]; then
        log_info "Cleaning up temporary files..."
        
        # Remove old temporary files (older than 1 hour)
        find "${TEMP_DIR}" -type f -mmin +60 -delete 2>/dev/null || true
        
        # Remove empty directories
        find "${TEMP_DIR}" -type d -empty -delete 2>/dev/null || true
        
        log_info "Temporary files cleaned up"
    fi
}

# Background cleanup process
start_cleanup_process() {
    if [ "${CLEANUP_TEMP_FILES}" = "true" ]; then
        log_info "Starting background cleanup process (interval: ${CLEANUP_INTERVAL}s)"
        (
            while true; do
                sleep "${CLEANUP_INTERVAL}"
                cleanup_temp_files
                # Clean up old log files (keep last 7 days)
                find "${LOGS_DIR}" -name "*.log.*" -type f -mtime +7 -delete 2>/dev/null || true
            done
        ) &
    fi
}

# ==============================================================================
# Signal Handling
# ==============================================================================

# Graceful shutdown handler
shutdown_handler() {
    log_info "Received shutdown signal, cleaning up..."
    
    # Kill background processes
    jobs -p | xargs -r kill
    
    # Final cleanup
    cleanup_temp_files
    
    log_info "Shutdown complete"
    exit 0
}

# Set up signal handlers
trap shutdown_handler SIGTERM SIGINT

# ==============================================================================
# Application Startup
# ==============================================================================

start_application() {
    log_info "Starting Lyricless Video Downloader..."
    log_info "Environment: ${NODE_ENV}"
    log_info "Node.js version: $(node --version)"
    log_info "Database URL: ${DATABASE_URL}"
    
    # Set additional environment variables for the application
    export NEXT_TELEMETRY_DISABLED=1
    export HOSTNAME="0.0.0.0"
    export PORT="${PORT:-3000}"
    
    # Start the application
    log_success "All initialization complete, starting application..."
    exec "$@"
}

# ==============================================================================
# Main Execution Flow
# ==============================================================================

main() {
    log_info "=== LYRICLESS DOCKER CONTAINER INITIALIZATION ==="
    log_info "Container started at: $(date)"
    log_info "Running as user: $(whoami)"
    log_info "Working directory: $(pwd)"
    
    # Run initialization steps
    setup_directories
    verify_dependencies
    setup_database
    health_check
    cleanup_temp_files
    start_cleanup_process
    
    # Start the application
    start_application "$@"
}

# ==============================================================================
# Error Handling
# ==============================================================================

# Global error handler
error_handler() {
    local line_no=$1
    local error_code=$2
    log_error "Script failed at line ${line_no} with exit code ${error_code}"
    
    # Attempt to log system information for debugging
    log_error "System information:"
    log_error "Disk usage: $(df -h /app 2>/dev/null || echo 'Unable to check disk usage')"
    log_error "Memory usage: $(free -h 2>/dev/null || echo 'Unable to check memory usage')"
    log_error "Process list: $(ps aux 2>/dev/null | head -10 || echo 'Unable to check processes')"
    
    exit "${error_code}"
}

trap 'error_handler ${LINENO} $?' ERR

# Run main function with all arguments
main "$@"