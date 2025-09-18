#!/bin/bash

# Script to install sharp for Alpine Linux
echo "Installing sharp for Alpine Linux..."

# Remove any existing sharp installation
npm uninstall sharp

# Install sharp with specific platform configuration
npm install sharp --platform=linuxmusl --arch=x64

echo "Sharp installation completed."
