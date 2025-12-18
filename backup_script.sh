#!/bin/bash

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/myProject/backups"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup the current build
if [ -d "/myProject/hamu_web/build" ]; then
  tar -czf "$BACKUP_DIR/hamu_web_build_$TIMESTAMP.tar.gz" -C /myProject/hamu_web build
  echo "Backup created at $BACKUP_DIR/hamu_web_build_$TIMESTAMP.tar.gz"
fi
