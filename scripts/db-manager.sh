#!/bin/bash

# Database management script for Lyricless

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DB_PATH="./prisma/dev.db"
BACKUP_DIR="./backups/manual"

function show_menu() {
    echo -e "${BLUE}=== Lyricless Database Manager ===${NC}"
    echo "1) Backup database"
    echo "2) Restore database"
    echo "3) Reset database (fresh start)"
    echo "4) Show database info"
    echo "5) List backups"
    echo "6) Export data as SQL"
    echo "7) Exit"
    echo ""
}

function backup_db() {
    mkdir -p "$BACKUP_DIR"
    
    if [ ! -f "$DB_PATH" ]; then
        echo -e "${RED}❌ No database found at $DB_PATH${NC}"
        return
    fi
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/dev_db_backup_$TIMESTAMP.db"
    
    echo -e "${YELLOW}Creating backup...${NC}"
    cp "$DB_PATH" "$BACKUP_FILE"
    
    # Backup related files
    for ext in "-journal" "-shm" "-wal"; do
        if [ -f "$DB_PATH$ext" ]; then
            cp "$DB_PATH$ext" "$BACKUP_FILE$ext"
        fi
    done
    
    echo -e "${GREEN}✓ Database backed up to: $BACKUP_FILE${NC}"
    
    # Show backup size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${BLUE}Backup size: $SIZE${NC}"
}

function restore_db() {
    echo -e "${YELLOW}Available backups:${NC}"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/*.db 2>/dev/null)" ]; then
        echo -e "${RED}No backups found${NC}"
        return
    fi
    
    # List backups with numbers
    BACKUPS=($(ls -t $BACKUP_DIR/*.db 2>/dev/null))
    for i in "${!BACKUPS[@]}"; do
        BACKUP_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "${BACKUPS[$i]}" 2>/dev/null || stat -c "%y" "${BACKUPS[$i]}" 2>/dev/null | cut -d. -f1)
        SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
        echo "$((i+1))) ${BACKUPS[$i]##*/} - $BACKUP_DATE - $SIZE"
    done
    
    echo ""
    read -p "Select backup to restore (number): " selection
    
    if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le "${#BACKUPS[@]}" ]; then
        SELECTED_BACKUP="${BACKUPS[$((selection-1))]}"
        
        # Create current backup before restore
        if [ -f "$DB_PATH" ]; then
            echo -e "${YELLOW}Backing up current database before restore...${NC}"
            backup_db
        fi
        
        echo -e "${YELLOW}Restoring from: $SELECTED_BACKUP${NC}"
        cp "$SELECTED_BACKUP" "$DB_PATH"
        
        # Restore related files
        for ext in "-journal" "-shm" "-wal"; do
            if [ -f "$SELECTED_BACKUP$ext" ]; then
                cp "$SELECTED_BACKUP$ext" "$DB_PATH$ext"
            fi
        done
        
        echo -e "${GREEN}✓ Database restored successfully${NC}"
    else
        echo -e "${RED}Invalid selection${NC}"
    fi
}

function reset_db() {
    echo -e "${YELLOW}⚠️  WARNING: This will delete all data!${NC}"
    read -p "Are you sure you want to reset the database? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" = "yes" ]; then
        # Backup first
        if [ -f "$DB_PATH" ]; then
            echo -e "${YELLOW}Creating backup before reset...${NC}"
            backup_db
        fi
        
        echo -e "${YELLOW}Resetting database...${NC}"
        rm -f "$DB_PATH" "$DB_PATH-journal" "$DB_PATH-shm" "$DB_PATH-wal"
        
        # Run migrations to create fresh database
        npx prisma migrate dev --name init
        
        echo -e "${GREEN}✓ Database reset complete${NC}"
    else
        echo -e "${BLUE}Reset cancelled${NC}"
    fi
}

function show_info() {
    if [ ! -f "$DB_PATH" ]; then
        echo -e "${RED}❌ No database found${NC}"
        return
    fi
    
    echo -e "${BLUE}Database Information:${NC}"
    echo "Path: $DB_PATH"
    echo "Size: $(du -h "$DB_PATH" | cut -f1)"
    echo "Modified: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$DB_PATH" 2>/dev/null || stat -c "%y" "$DB_PATH" 2>/dev/null | cut -d. -f1)"
    
    # Show record counts
    echo ""
    echo -e "${BLUE}Record counts:${NC}"
    
    # Get extraction count
    EXTRACTION_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM extractions;" 2>/dev/null || echo "0")
    echo "Extractions: $EXTRACTION_COUNT"
}

function list_backups() {
    echo -e "${BLUE}Available backups:${NC}"
    
    for dir in "$BACKUP_DIR" "./backups/git-pull"; do
        if [ -d "$dir" ] && [ -n "$(ls -A $dir/*.db 2>/dev/null)" ]; then
            echo ""
            echo -e "${YELLOW}$dir:${NC}"
            ls -lht "$dir"/*.db 2>/dev/null | head -10
        fi
    done
    
    # Show total backup size
    if [ -d "./backups" ]; then
        TOTAL_SIZE=$(du -sh ./backups 2>/dev/null | cut -f1)
        echo ""
        echo -e "${BLUE}Total backup size: $TOTAL_SIZE${NC}"
    fi
}

function export_sql() {
    if [ ! -f "$DB_PATH" ]; then
        echo -e "${RED}❌ No database found${NC}"
        return
    fi
    
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    SQL_FILE="$BACKUP_DIR/lyricless_export_$TIMESTAMP.sql"
    
    echo -e "${YELLOW}Exporting database as SQL...${NC}"
    sqlite3 "$DB_PATH" .dump > "$SQL_FILE"
    
    echo -e "${GREEN}✓ Exported to: $SQL_FILE${NC}"
    echo "Size: $(du -h "$SQL_FILE" | cut -f1)"
}

# Main loop
while true; do
    show_menu
    read -p "Select option: " choice
    echo ""
    
    case $choice in
        1) backup_db ;;
        2) restore_db ;;
        3) reset_db ;;
        4) show_info ;;
        5) list_backups ;;
        6) export_sql ;;
        7) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    clear
done