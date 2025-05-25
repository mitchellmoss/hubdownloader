# Database Safety Guide

This guide explains how to protect your database from being accidentally committed or overwritten.

## 🛡️ Protection Mechanisms

### 1. Git Ignore
All database files are automatically ignored:
- `*.db`, `*.sqlite`, `*.sqlite3`
- Database journal files (`*.db-journal`, `*.db-shm`, `*.db-wal`)
- Backup files (`*.backup`, `*.sql`, `*.dump`)
- The entire `/backups/` directory

### 2. Pre-commit Hook
A git hook prevents accidental database commits:
- Automatically blocks commits containing database files
- Warns about large files (>5MB)
- Shows instructions to unstage database files

### 3. Safe Pull Script
Use `./scripts/safe-pull.sh` instead of `git pull`:
```bash
# Safe way to pull changes
./scripts/safe-pull.sh
```

This script:
- ✅ Backs up your database before pulling
- ✅ Backs up your .env files
- ✅ Stashes uncommitted changes
- ✅ Runs migrations if schema changed
- ✅ Keeps last 10 backups

### 4. Database Manager
Use `./scripts/db-manager.sh` for database operations:
```bash
./scripts/db-manager.sh
```

Features:
- Backup database manually
- Restore from any backup
- Reset database (fresh start)
- Show database information
- List all backups
- Export as SQL

## 📋 Best Practices

### Always Use Safe Pull
```bash
# ❌ Don't do this
git pull

# ✅ Do this instead
./scripts/safe-pull.sh
```

### Regular Backups
```bash
# Manual backup
./scripts/db-manager.sh
# Select option 1

# Or use the backup command directly
cp prisma/dev.db backups/manual/backup_$(date +%Y%m%d).db
```

### Before Major Changes
1. Create a backup
2. Document the current state
3. Test migrations on a copy first

### Production Deployment
```bash
# Never sync production DB to git
# Always use separate production database
# Use environment-specific .env files
```

## 🚨 Emergency Recovery

### If Database Gets Corrupted
```bash
# List available backups
./scripts/db-manager.sh
# Select option 5 to list backups
# Select option 2 to restore
```

### If Accidentally Committed Database
```bash
# Remove from git history (destructive!)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch prisma/*.db' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team!)
git push origin --force --all
```

### Manual Restore
```bash
# Find your backup
ls -la backups/*/

# Restore specific backup
cp backups/manual/dev_db_backup_20240301_120000.db prisma/dev.db
```

## 🔧 Setup Instructions

### Initial Setup (Already Done)
```bash
# These are already configured in the repository:
# 1. .gitignore entries
# 2. Git hooks in .git/hooks/
# 3. Helper scripts in scripts/

# Just ensure scripts are executable
chmod +x scripts/*.sh
```

### For New Developers
```bash
# Clone repository
git clone https://github.com/mitchellmoss/hubdownloader.git
cd hubdownloader

# Copy environment file
cp .env.example .env

# Create fresh database
npx prisma migrate dev

# Verify hooks are active
git status
# Should see no database files
```

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Safe pull | `./scripts/safe-pull.sh` |
| Backup database | `./scripts/db-manager.sh` → Option 1 |
| Restore database | `./scripts/db-manager.sh` → Option 2 |
| Reset database | `./scripts/db-manager.sh` → Option 3 |
| Check what will be committed | `git status` |
| Remove file from staging | `git reset HEAD -- filename` |

## ⚠️ Warning Signs

Watch for these signs that something might be wrong:

1. **Git status shows .db files** - Don't commit!
2. **Large commit size** - Check for database files
3. **Migration conflicts** - Backup before resolving
4. **Missing data after pull** - Check backups directory

## 📝 Notes

- Backups are kept in `backups/` directory (git-ignored)
- Each safe-pull creates timestamped backups
- Old backups are automatically cleaned (keeps last 10)
- Database path: `prisma/dev.db`
- Production should use different database (PostgreSQL, MySQL, etc.)

Remember: **When in doubt, make a backup!**