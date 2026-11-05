# Traccar Connection Guide

## Quick Connection Steps After Oracle Cloud Setup

Once you have Traccar running on Oracle Cloud, follow these steps to connect it to your Wecho app:

## Step 1: Get Your Oracle Cloud Instance Details

From your Oracle Cloud Console, note down:
- **Public IP Address**: e.g., `123.45.67.89`
- **Traccar Web URL**: `http://123.45.67.89:8082`

## Step 2: Access Traccar Web Interface

1. Open browser: `http://YOUR_PUBLIC_IP:8082`
2. Login with: `admin` / `admin`
3. **IMPORTANT**: Change the default password immediately

## Step 3: Create API User for Wecho

1. In Traccar, go to **Admin** → **Users**
2. Click **Add User**
3. Configure:
   - **Name**: `wecho-api`
   - **Email**: `wecho@yourdomain.com`
   - **Password**: (generate strong password, e.g., `WechoSecure123!`)
   - **User**: `wecho-api`
   - **Read Only**: ✅ Check this box
4. Click **Save**

## Step 4: Update Wecho Backend

### Option A: Update Render (Recommended)
1. Go to your Render dashboard: `https://dashboard.render.com`
2. Find your `wecho-backend` service
3. Click **Environment** tab
4. Add these environment variables:

```
TRACCAR_URL = http://YOUR_PUBLIC_IP:8082
TRACCAR_USERNAME = wecho-api
TRACCAR_PASSWORD = WechoSecure123!
TRACCAR_SYNC_INTERVAL_MS = 10000
```

5. Click **Save Changes**
6. Trigger a new deployment

### Option B: Update Local Development
Edit `C:\dev\wecho_backend\.env`:
```bash
TRACCAR_URL=http://YOUR_PUBLIC_IP:8082
TRACCAR_USERNAME=wecho-api
TRACCAR_PASSWORD=WechoSecure123!
TRACCAR_SYNC_INTERVAL_MS=10000
```

## Step 5: Test Connection

### Add Test Device in Traccar:
1. In Traccar web interface, go to **Devices**
2. Click **Add Device**
3. Configure:
   - **Name**: `Test Vehicle`
   - **Unique ID**: `test-tracker-123`
   - **Device Identifier**: (optional)
4. Click **Save**

### Connect in Wecho App:
1. Open Wecho app on your phone
2. Go to **My Vehicles**
3. Select a vehicle
4. Click **Connect Tracker**
5. Enter: `test-tracker-123`
6. Click **Connect Device**

### Verify:
- In Traccar: Device should appear in devices list
- In Wecho: Vehicle should show as linked
- Wait a few minutes for first sync

## Step 6: Connect Real GPS Tracker

### Choose Your Tracker:
- **TK103/TK104**: Budget option (~$20-30)
- **Teltonika FMB110**: Professional (~$50-70)
- **Meitrack T1**: Mid-range (~$40-60)

### Configure Tracker:
1. Insert SIM card with data plan
2. Power on tracker
3. Configure via SMS (varies by model):

**For TK103:**
```
adminip12345678905055
apn,internet
admin123456
```

**For Teltonika:**
```
APN,internet
```

4. Set reporting interval (e.g., 60 seconds)

### Add to Traccar:
1. In Traccar, add new device
2. Use tracker's IMEI as Unique ID
3. Select correct protocol (tk103, teltonika, etc.)
4. Save

### Connect in Wecho:
1. Use same Unique ID in Wecho app
2. Connect to vehicle
3. Verify location updates appear

## Troubleshooting

### Traccar Not Accessible:
- Check Oracle Cloud firewall rules
- Verify Traccar container is running: `docker-compose ps`
- Check if ports are open: `sudo netstat -tlnp | grep 8082`

### Wecho Not Receiving Updates:
- Verify TRACCAR_URL is correct
- Check API user credentials
- Verify backend can reach Traccar
- Check backend logs for sync errors

### Tracker Not Connecting:
- Verify tracker has internet connection
- Check tracker configuration (IP, port, APN)
- Verify correct protocol in Traccar
- Check Traccar logs for connection attempts

## Quick Reference

### Oracle Cloud Instance:
- **SSH Connect**: `ssh -i private_key.pem ubuntu@YOUR_PUBLIC_IP`
- **Traccar Web**: `http://YOUR_PUBLIC_IP:8082`
- **Traccar Admin**: `admin` / `your_new_password`
- **Traccar API**: `wecho-api` / `WechoSecure123!`

### Wecho Backend:
- **Render URL**: `https://wecho-backend.onrender.com`
- **Traccar URL**: `http://YOUR_PUBLIC_IP:8082`
- **Sync Interval**: 10 seconds

### Tracker Ports:
- **Web Interface**: 8082
- **Default Tracker**: 5055
- **Teltonika**: 5023
- **TK103**: 5013
- **GPS103**: 5025
- **Meitrack**: 5027

## File Locations

### Oracle Cloud Instance:
- **Traccar Directory**: `~/traccar`
- **Docker Compose**: `~/traccar/docker-compose.yml`
- **Traccar Logs**: `docker-compose logs -f`

### Local Development:
- **Backend Config**: `C:\dev\wecho_backend\.env`
- **Flutter Config**: `C:\dev\wecho_app\lib\config.dart`

## Next Steps

Once everything is connected:
1. Test with a real GPS tracker
2. Verify live tracking in Wecho app
3. Set up geofences and alerts
4. Monitor trip history
5. Configure notification preferences

Your GPS tracking system is now fully operational! 🚗📍
