#!/bin/bash

# Safe git pull script that backs up database before pulling

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Safe Git Pull - Protecting your database${NC}"
echo "========================================"

# Create backup directory
BACKUP_DIR="./backups/git-pull"
mkdir -p "$BACKUP_DIR"

# Backup database if it exists
DB_PATH="./prisma/dev.db"
if [ -f "$DB_PATH" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/dev_db_backup_$TIMESTAMP.db"
    
    echo -e "${YELLOW}📦 Backing up database...${NC}"
    cp "$DB_PATH" "$BACKUP_FILE"
    
    # Also backup journal files if they exist
    if [ -f "$DB_PATH-journal" ]; then
        cp "$DB_PATH-journal" "$BACKUP_FILE-journal"
    fi
    if [ -f "$DB_PATH-shm" ]; then
        cp "$DB_PATH-shm" "$BACKUP_FILE-shm"
    fi
    if [ -f "$DB_PATH-wal" ]; then
        cp "$DB_PATH-wal" "$BACKUP_FILE-wal"
    fi
    
    echo -e "${GREEN}✓ Database backed up to: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}ℹ️  No database found to backup${NC}"
fi

# Backup .env files if they exist
for env_file in .env .env.local .env.production; do
    if [ -f "$env_file" ]; then
        cp "$env_file" "$BACKUP_DIR/${env_file}_backup_$TIMESTAMP"
        echo -e "${GREEN}✓ Backed up $env_file${NC}"
    fi
done

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    echo "Stashing changes before pull..."
    git stash push -m "Auto-stash before safe-pull on $(date)"
    STASHED=true
else
    STASHED=false
fi

# Perform git pull
echo -e "${BLUE}🔄 Pulling latest changes...${NC}"
git pull

# Reapply stashed changes if any
if [ "$STASHED" = true ]; then
    echo -e "${YELLOW}📥 Reapplying stashed changes...${NC}"
    git stash pop || {
        echo -e "${RED}❌ Failed to reapply stashed changes${NC}"
        echo -e "${YELLOW}Your changes are still in the stash. Use 'git stash list' to see them.${NC}"
    }
fi

# Run database migrations if needed
if [ -f "package.json" ] && grep -q "prisma" package.json; then
    echo -e "${BLUE}🔧 Running database migrations...${NC}"
    npx prisma migrate deploy || {
        echo -e "${YELLOW}⚠️  Migration failed. Your database backup is at: $BACKUP_FILE${NC}"
    }
fi

# Clean up old backups (keep last 10)
echo -e "${BLUE}🧹 Cleaning old backups...${NC}"
cd "$BACKUP_DIR"
ls -t dev_db_backup_*.db 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
cd - > /dev/null

echo -e "${GREEN}✅ Git pull completed safely!${NC}"
echo ""
echo -e "${YELLOW}Tips:${NC}"
echo "• Your database backup is at: $BACKUP_FILE"
echo "• To restore: cp $BACKUP_FILE $DB_PATH"
echo "• View all backups: ls -la $BACKUP_DIR/"