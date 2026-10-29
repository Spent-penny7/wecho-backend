# Deploy Wecho Backend to Render (Free Tier)

This guide will help you deploy your Wecho backend to Render for free, so your payment flow works without keeping your laptop running.

## Prerequisites

1. **GitHub Account** (free)
2. **Render Account** (free - signup at render.com)
3. **Firebase Service Account Key** (already have this locally)

## Step 1: Push Code to GitHub

1. Create a new repository on GitHub
2. Initialize git in your backend folder:
   ```bash
   cd C:\dev\wecho_backend
   git init
   git add .
   git commit -m "Initial commit for Render deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/wecho-backend.git
   git push -u origin main
   ```

## Step 2: Deploy to Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the `wecho-backend` repository
4. Configure the service:
   - **Name**: `wecho-backend`
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (selected by default)

## Step 3: Set Environment Variables

In the Render dashboard for your service, add these environment variables:

### Required Variables:

1. **PAYSTACK_SECRET_KEY**
   - Value: `sk_test_889f4cf279027a351c156aee352385c44af445d`
   - Or your actual Paystack secret key

2. **FIREBASE_SERVICE_ACCOUNT_KEY**
   - Value: The entire content of your `serviceAccountKey.json` file as a JSON string
   - To get this: Open your `serviceAccountKey.json` file, copy everything, and paste it here
   - Make sure to escape any quotes properly if needed

### Optional Variables:

3. **PORT**
   - Value: `10000` (Render's default port)
   - This is automatically set by Render

## Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for the deployment to complete (2-3 minutes)
3. Render will give you a URL like: `https://wecho-backend.onrender.com`

## Step 5: Update Flutter App

1. Update your Flutter config file:
   ```dart
   // In C:\dev\wecho_app\lib\config.dart
   const String kApiBaseUrl = String.fromEnvironment(
     'WECHO_API_BASE_URL',
     defaultValue: 'https://wecho-backend.onrender.com', // Replace with your actual Render URL
   );
   ```

2. Run your Flutter app on your phone:
   ```bash
   cd C:\dev\wecho_app
   flutter run
   ```

## Step 6: Test Payment Flow

1. Open the app on your phone
2. Go to Settings → Subscription
3. Try upgrading to a paid plan
4. Complete the payment flow
5. Verify subscription is updated in Firestore

## Important Notes:

### Free Tier Limitations:
- **Spin-up time**: Free services spin down after 15 minutes of inactivity and take ~30 seconds to wake up
- **Uptime**: Not guaranteed 100% (suitable for development/testing)
- **Resources**: Limited CPU and memory

### For Production:
Consider upgrading to a paid plan ($7/month) for:
- Zero spin-up time
- Better performance
- 99.9% uptime SLA

### Monitoring:
- Check Render dashboard for logs
- Monitor service health in Render dashboard
- Set up alerts if needed

## Troubleshooting:

### Service won't start:
- Check Render logs for errors
- Verify environment variables are set correctly
- Ensure Firebase service account key is valid

### Payment initialization fails:
- Verify PAYSTACK_SECRET_KEY is correct
- Check Render logs for API errors
- Ensure Paystack test mode is enabled

### Firebase connection issues:
- Verify FIREBASE_SERVICE_ACCOUNT_KEY is properly formatted
- Check that Firebase project is active
- Ensure service account has necessary permissions

## Alternative: Railway (Also Free)

If Render doesn't work, try Railway:
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set environment variables
5. Railway will provide a URL like `https://wecho-backend.up.railway.app`

Both Render and Railway offer generous free tiers perfect for development and testing!
