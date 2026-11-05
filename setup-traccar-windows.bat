@echo off
REM Traccar Setup Instructions for Oracle Cloud (Windows Users)
REM This file contains the commands you need to run on your Oracle Cloud instance

echo.
echo ========================================
echo Traccar Setup for Oracle Cloud
echo ========================================
echo.
echo Follow these steps to set up Traccar on your Oracle Cloud instance:
echo.
echo 1. Connect to your Oracle Cloud instance using SSH:
echo    ssh -i private_key.pem ubuntu@YOUR_PUBLIC_IP
echo.
echo 2. Once connected, run these commands one by one:
echo.
echo    # Update system
echo    sudo apt update ^&^& sudo apt upgrade -y
echo.
echo    # Install Docker
echo    curl -fsSL https://get.docker.com -o get-docker.sh
echo    sudo sh get-docker.sh
echo    sudo usermod -aG docker $USER
echo.
echo    # Logout and login again for group changes
echo    exit
echo.
echo    # Reconnect with SSH
echo    ssh -i private_key.pem ubuntu@YOUR_PUBLIC_IP
echo.
echo    # Create Traccar directory and start it
echo    mkdir ~/traccar
echo    cd ~/traccar
echo    wget https://raw.githubusercontent.com/traccar/traccar-docker/master/docker-compose.yml
echo    docker-compose up -d
echo.
echo 3. Configure firewall in Oracle Cloud Console:
echo    - Open ports: 8082, 5055, 5023, 5013, 5025, 5027
echo    - Source: 0.0.0.0/0
echo.
echo 4. Access Traccar web interface:
echo    http://YOUR_PUBLIC_IP:8082
echo    Default credentials: admin / admin
echo.
echo For detailed instructions, see ORACLE_CLOUD_SETUP.md
echo.
pause