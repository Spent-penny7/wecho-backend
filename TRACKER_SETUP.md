# Real GPS Tracker Setup Guide

This guide will help you connect real GPS trackers to your Wecho app using Traccar integration.

## Overview

Your Wecho backend already supports Traccar integration, which allows you to connect hundreds of different GPS tracker brands and protocols. Traccar acts as a central server that receives GPS data from trackers and makes it available to your Wecho app.

## Architecture

```
Real GPS Tracker → Traccar Server → Wecho Backend → Firestore → Wecho App
```

## Step 1: Set Up Traccar Server

### Option A: Use Traccar Cloud (Easiest)
1. Go to [traccar.cloud](https://traccar.cloud)
2. Sign up for an account (they have a free tier)
3. Get your Traccar server URL and API credentials

### Option B: Self-Host Traccar (Recommended for Production)
1. Download Traccar from [traccar.org](https://www.traccar.org/download/)
2. Install on your server or VPS
3. Configure port forwarding for tracker protocols
4. Set up user account with API access

### Option C: Use Docker (Quick Setup)
```bash
docker run -d --name traccar \
  -p 8082:8082 \
  -p 5055:5055 \
  -e TRACCAR_ENV_CONFIG=traccar.xml \
  traccar/traccar:latest
```

## Step 2: Configure Your Wecho Backend

### Update Environment Variables

Update your `.env` file or Render environment variables:

```bash
# Traccar Configuration
TRACCAR_URL=https://your-traccar-server.com
TRACCAR_USERNAME=your_traccar_username
TRACCAR_PASSWORD=your_traccar_password
TRACCAR_SYNC_INTERVAL_MS=10000
```

### For Render Deployment:
1. Go to your Render dashboard
2. Add these environment variables:
   - `TRACCAR_URL`: Your Traccar server URL
   - `TRACCAR_USERNAME`: Your Traccar username
   - `TRACCAR_PASSWORD`: Your Traccar password
   - `TRACCAR_SYNC_INTERVAL_MS`: `10000` (10 seconds)

3. Redeploy the service

## Step 3: Add Your GPS Tracker to Traccar

### Supported Tracker Brands
Traccar supports 200+ tracker brands including:
- TK103, TK104, TK116
- GPS103, GPS104
- Meitrack
- Teltonika
- Queclink
- Concox
- And many more...

### Steps to Add Tracker:
1. **Log in to Traccar** web interface
2. **Click "Add Device"** 
3. **Enter device details**:
   - **Name**: Your tracker name (e.g., "Car 1 Tracker")
   - **Unique ID**: The tracker's IMEI or serial number
   - **Device Identifier**: Optional custom identifier

4. **Configure tracker protocol**:
   - Select the correct protocol for your tracker model
   - Common protocols: `tk103`, `teltonika`, `meitrack`, `osmand`

5. **Save the device**

## Step 4: Configure Your Physical GPS Tracker

### General Setup Steps:
1. **Insert SIM card** with data plan into tracker
2. **Power on** the tracker
3. **Configure APN settings** (usually via SMS commands):
   ```
   APN,your_apn_username,your_apn_password
   ```
4. **Set server IP and port** (via SMS):
   ```
   APN,your_traccar_server_ip,port
   ```
5. **Set reporting interval** (how often it sends GPS data):
   ```
   FIX,60s
   ```

### Example SMS Commands (varies by tracker):
```
adminip12345678905055
apn,internet
admin123456
```

## Step 5: Connect Tracker in Wecho App

1. **Open Wecho App** on your phone
2. **Go to "My Vehicles"**
3. **Select a vehicle** or register a new one
4. **Click "Connect Tracker"**
5. **Enter the Unique ID** you set in Traccar
   - This should match the tracker's IMEI/serial number
6. **Click "Connect Device"**

## Step 6: Verify Connection

### Check Traccar:
1. Log in to Traccar web interface
2. You should see your device appearing on the map
3. Check that it's receiving GPS updates

### Check Wecho App:
1. Go to "Live Tracking" in Wecho app
2. You should see your vehicle's current location
3. Check "My Vehicles" for status updates

## Popular GPS Tracker Recommendations

### Budget Options:
- **TK103/TK104**: ~$20-30, basic tracking
- **GPS103**: ~$25-35, reliable
- **Concox ATV1**: ~$30-40, good battery life

### Mid-Range:
- **Teltonika FMB110**: ~$50-70, professional grade
- **Meitrack T1**: ~$40-60, good features
- **Queclink GV300**: ~$45-65, reliable

### Premium:
- **Teltonika FMB120**: ~$80-100, advanced features
- **Queclink GV500**: ~$90-120, industrial grade

## Troubleshooting

### Tracker Not Appearing in Traccar:
- Check SIM card has data and credit
- Verify APN settings are correct
- Ensure tracker has GPS signal
- Check tracker is powered on
- Verify server IP and port are correct

### Not Appearing in Wecho App:
- Verify Traccar sync is working (check backend logs)
- Ensure Unique ID matches exactly in both systems
- Check vehicle is linked to correct tracker ID
- Verify backend is receiving Traccar data

### Delayed Updates:
- Reduce TRACCAR_SYNC_INTERVAL_MS (default 10 seconds)
- Check tracker reporting interval
- Verify internet connection stability

## Alternative: Direct HTTP Tracking

If you don't want to use Traccar, some trackers support direct HTTP POST:

1. Configure tracker to send HTTP POST to your backend:
   ```
   POST https://wecho-backend.onrender.com/ping
   ```
2. Use the same format as the simulator:
   ```json
   {
     "trackerId": "your-tracker-id",
     "lat": 4.8156,
     "lng": 7.0498,
     "speed": 45,
     "ignition": true,
     "battery": 85
   }
   ```

## Security Notes

- Use HTTPS for all connections
- Keep Traccar credentials secure
- Use strong passwords for tracker admin
- Regularly update tracker firmware
- Monitor for unauthorized devices

## Next Steps

1. Choose your Traccar setup option
2. Get your GPS tracker hardware
3. Configure Traccar server
4. Add tracker to Traccar
5. Connect in Wecho app
6. Test the full tracking flow

Your Wecho system is now ready for real GPS tracking! 🚗📍
