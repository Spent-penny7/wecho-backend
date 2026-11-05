# Traccar Setup on Oracle Cloud Always Free

This guide will help you set up Traccar GPS tracking server on Oracle Cloud's free tier, giving you 24/7 online tracking without any ongoing costs.

## Oracle Cloud Always Free Benefits

- **Cost**: Completely free (no monthly fees)
- **Resources**: 
  - 2 AMD CPUs
  - 1GB RAM
  - 200GB storage
  - 10TB/month data transfer
- **Always Online**: Yes, runs 24/7
- **Duration**: Forever (as long as Oracle maintains the program)

## Prerequisites

- Oracle Cloud account (free)
- Basic understanding of command line
- About 30 minutes for initial setup

## Step 1: Create Oracle Cloud Account

1. Go to [oracle.com/cloud](https://www.oracle.com/cloud)
2. Click "Try for Free"
3. Sign up with your email
4. You'll need to add a credit card for verification (but won't be charged)
5. Complete the account verification process

## Step 2: Create a Free Tier Instance

1. Log in to Oracle Cloud Console
2. Click the **hamburger menu** (≡) → **Compute** → **Instances**
3. Click **Create Instance**
4. Configure the instance:

### Instance Details:
- **Name**: `traccar-server`
- **Compartment**: Select your compartment (usually root compartment)

### Shape (Choose Always Free):
- **Shape**: VM.Standard.E2.1.Micro (Always Free)
- **OCPU**: 1 OCPU (Always Free)
- **Memory**: 1GB (Always Free)
- **Network**: 1 Gbps (Always Free)

### Operating System:
- **Image**: Oracle Linux 8 or Ubuntu 22.04
- **Boot Volume**: 200GB (Always Free)

### SSH Keys:
1. Click **Create SSH Key**
2. Choose "Generate a SSH Key Pair"
3. Save the private key file (keep this safe!)
4. Download the public key
5. The private key will be automatically saved to your computer

### Networking:
- **Virtual Cloud Network**: Create new VCN
- **Subnet**: Create new subnet
- **Assign Public IP**: Yes (essential for tracker connections)

### Review and Create:
1. Review all settings
2. Click **Create**
3. Wait 5-10 minutes for instance to be ready

## Step 3: Connect to Your Instance

### On Windows (using PowerShell):

```powershell
# Navigate to where your private key was saved
cd C:\Users\YourUsername\Downloads

# Set correct permissions for the private key
icacls private_key.pem /inheritance:r
icacls private_key.pem /grant:r "%USERNAME%:R"

# Connect to the instance
ssh -i private_key.pem ubuntu@YOUR_PUBLIC_IP
```

Replace:
- `private_key.pem` with your actual private key filename
- `YOUR_PUBLIC_IP` with your instance's public IP (shown in Oracle Console)

### First Connection:
- You'll see a warning about fingerprint authenticity - type "yes"
- You're now connected to your Oracle Cloud instance!

## Step 4: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Enable Docker to start on boot
sudo systemctl enable docker

# Logout and login again for group changes to take effect
exit
```

Reconnect to the instance using the SSH command from Step 3.

## Step 5: Install Traccar with Docker

```bash
# Create Traccar directory
mkdir ~/traccar
cd ~/traccar

# Download Traccar Docker configuration
wget https://raw.githubusercontent.com/traccar/traccar-docker/master/docker-compose.yml

# Start Traccar
docker-compose up -d

# Check if Traccar is running
docker-compose ps
```

## Step 6: Configure Firewall in Oracle Cloud

1. Go back to Oracle Cloud Console
2. Navigate to **Networking** → **Virtual Cloud Networks**
3. Click on your VCN
4. Go to **Security Lists** → **Default Security List**
5. Add Ingress Rules:

### Required Ports:
- **Port 8082**: TCP, Source: 0.0.0.0/0 (for web interface)
- **Port 5055**: TCP, Source: 0.0.0.0/0 (for tracker connections)
- **Port 5023**: TCP, Source: 0.0.0.0/0 (for Teltonika protocol)
- **Port 5013**: TCP, Source: 0.0.0.0/0 (for TK103 protocol)

### Adding Ingress Rules:
1. Click **Add Ingress Rules**
2. For each port:
   - **Source Type**: CIDR
   - **Source CIDR**: 0.0.0.0/0
   - **IP Protocol**: TCP
   - **Destination Port**: 8082 (then repeat for other ports)
   - **Description**: Traccar Web / Tracker Port

## Step 7: Access Traccar Web Interface

1. Open your browser
2. Go to: `http://YOUR_PUBLIC_IP:8082`
3. Default credentials:
   - **Username**: `admin`
   - **Password**: `admin`

### Change Default Password:
1. Click on your username (top right)
2. Go to **Account**
3. Change the password immediately

## Step 8: Configure Traccar for Wecho Integration

### Create Read-Only API User:
1. In Traccar web interface, go to **Admin** → **Users**
2. Click **Add User**
3. Configure:
   - **Name**: `wecho-api`
   - **Email**: `wecho@yourdomain.com`
   - **Password**: (generate strong password)
   - **User**: `wecho-api`
   - **Read Only**: Check this box (important for security)
4. Click **Save**

### Note Your Credentials:
- **Traccar URL**: `http://YOUR_PUBLIC_IP:8082`
- **Username**: `wecho-api`
- **Password**: (the password you set)

## Step 9: Update Wecho Backend Configuration

### Option A: Update Render Environment Variables:
1. Go to your Render dashboard
2. Add these environment variables:
   - `TRACCAR_URL`: `http://YOUR_PUBLIC_IP:8082`
   - `TRACCAR_USERNAME`: `wecho-api`
   - `TRACCAR_PASSWORD`: `your_password`
   - `TRACCAR_SYNC_INTERVAL_MS`: `10000`

3. Redeploy the service

### Option B: Update Local .env File:
```bash
cd C:\dev\wecho_backend
```

Edit `.env` file:
```bash
TRACCAR_URL=http://YOUR_PUBLIC_IP:8082
TRACCAR_USERNAME=wecho-api
TRACCAR_PASSWORD=your_password
TRACCAR_SYNC_INTERVAL_MS=10000
```

## Step 10: Test the Integration

### Add a Test Device in Traccar:
1. In Traccar web interface, go to **Devices**
2. Click **Add Device**
3. Configure:
   - **Name**: `Test Tracker`
   - **Unique ID**: `test123`
   - **Device Identifier**: (optional)
4. Click **Save**

### Test in Wecho App:
1. Open Wecho app
2. Go to **My Vehicles**
3. Select a vehicle
4. Click **Connect Tracker**
5. Enter: `test123`
6. Click **Connect Device**

### Verify Connection:
- Check Traccar web interface - you should see the device
- Check Wecho app - vehicle should show as linked
- Wait for first GPS update (may take a few minutes)

## Step 11: Connect Real GPS Tracker

### Configure Your Physical Tracker:
1. Insert SIM card with data plan
2. Configure via SMS commands (varies by tracker model):

For TK103/TK104:
```
adminip12345678905055
apn,internet
admin123456
```

For Teltonika:
```
APN,internet
```

3. Set reporting interval (e.g., every 60 seconds)

### Add Tracker to Traccar:
1. In Traccar, add new device
2. Use tracker's IMEI as Unique ID
3. Select correct protocol (tk103, teltonika, etc.)

### Connect in Wecho App:
1. Use the same Unique ID in Wecho app
2. Connect tracker to vehicle
3. Verify location updates

## Step 12: Monitor and Maintain

### Check Traccar Status:
```bash
# SSH into your Oracle instance
ssh -i private_key.pem ubuntu@YOUR_PUBLIC_IP

# Check Traccar logs
cd ~/traccar
docker-compose logs -f
```

### Restart Traccar if needed:
```bash
cd ~/traccar
docker-compose restart
```

### Update Traccar:
```bash
cd ~/traccar
docker-compose pull
docker-compose up -d
```

## Troubleshooting

### Can't Access Web Interface:
- Check firewall rules in Oracle Cloud Console
- Verify Docker containers are running: `docker-compose ps`
- Check if port 8082 is open: `sudo netstat -tlnp | grep 8082`

### Trackers Not Connecting:
- Verify tracker has internet connection
- Check firewall allows tracker ports (5055, 5023, etc.)
- Verify tracker is configured with correct server IP and port
- Check Traccar logs for connection attempts

### Wecho App Not Receiving Updates:
- Verify TRACCAR_URL is correct in backend
- Check API user credentials
- Verify backend can reach Traccar server
- Check backend logs for sync errors

### Oracle Instance Issues:
- Check instance status in Oracle Console
- Verify instance is in "Running" state
- Check available resources (CPU, memory)

## Security Recommendations

1. **Change Default Passwords**: Change admin password immediately
2. **Use HTTPS**: Set up SSL certificate for production
3. **Firewall Rules**: Only open necessary ports
4. **Regular Updates**: Keep Traccar and system updated
5. **Monitor Usage**: Check Oracle Cloud usage regularly
6. **Backup Data**: Regular backups of Traccar database

## Cost Monitoring

Oracle Cloud provides monitoring tools:
- Go to **Billing & Cost Management**
- Monitor your free tier usage
- You'll get alerts if approaching limits

## Scaling Up

If you need more resources:
- Upgrade to paid instance (still affordable)
- Add more storage if needed
- Consider load balancing for many trackers

## Next Steps

1. ✅ Oracle Cloud account created
2. ✅ Traccar instance deployed
3. ✅ Firewall configured
4. ✅ Wecho backend updated
5. ✅ Test tracker connected
6. ✅ Real tracker configured

Your GPS tracking system is now running 24/7 on Oracle Cloud's free tier! 🚗📍

## Support Resources

- [Traccar Documentation](https://www.traccar.org/documentation/)
- [Oracle Cloud Documentation](https://docs.oracle.com/en-us/iaas/)
- [Traccar Forum](https://www.traccar.org/forums/)
