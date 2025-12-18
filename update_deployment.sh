#!/bin/bash

# Move to temporary directory where build.zip was uploaded
cd /tmp

# Check if the zip file exists
if [ ! -f build.zip ]; then
  echo "Error: build.zip not found in /tmp"
  exit 1
fi

# Create a backup of current deployment (if directory exists)
if [ -d "/home/myProject/hamu_web/build" ]; then
  sudo cp -r /home/myProject/hamu_web/build /home/myProject/hamu_web/build_backup_$(date +%Y%m%d_%H%M%S)
fi

# Make sure build directory exists
sudo mkdir -p /home/myProject/hamu_web/build

# Clear existing directory content
sudo rm -rf /home/myProject/hamu_web/build/*

# Extract build.zip directly to the correct location
sudo unzip -o build.zip -d /home/myProject/hamu_web/build

# Fix permissions to ensure www-data has ownership
sudo chown -R www-data:www-data /home/myProject/hamu_web/build

# Restart Nginx to apply changes
sudo systemctl restart nginx

echo "Deployment complete. New build has been deployed to /home/myProject/hamu_web/build/"
