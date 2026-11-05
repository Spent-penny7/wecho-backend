#!/bin/bash

# Traccar Setup Script for Oracle Cloud
# This script automates the installation of Traccar on Oracle Cloud Free Tier

set -e

echo "🚀 Starting Traccar setup on Oracle Cloud..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "📝 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed successfully"
else
    echo "✅ Docker Compose already installed"
fi

# Create Traccar directory
echo "📁 Creating Traccar directory..."
mkdir -p ~/traccar
cd ~/traccar

# Download Traccar docker-compose file
echo "⬇️ Downloading Traccar configuration..."
if [ ! -f "docker-compose.yml" ]; then
    wget https://raw.githubusercontent.com/traccar/traccar-docker/master/docker-compose.yml
    echo "✅ Docker compose file downloaded"
else
    echo "✅ Docker compose file already exists"
fi

# Start Traccar
echo "🚀 Starting Traccar..."
docker-compose up -d

# Wait for Traccar to start
echo "⏳ Waiting for Traccar to start..."
sleep 10

# Check if Traccar is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Traccar is running successfully!"
    echo ""
    echo "🌐 Access Traccar web interface at: http://$(curl -s ifconfig.me):8082"
    echo "🔑 Default credentials: admin / admin"
    echo "⚠️  Please change the default password immediately!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Open http://$(curl -s ifconfig.me):8082 in your browser"
    echo "2. Login with admin/admin"
    echo "3. Change the default password"
    echo "4. Create a read-only API user for Wecho integration"
    echo "5. Configure firewall rules in Oracle Cloud Console"
    echo "6. Update Wecho backend with Traccar credentials"
else
    echo "❌ Traccar failed to start. Check logs with: docker-compose logs"
    exit 1
fi

echo ""
echo "🎉 Traccar setup completed successfully!"
