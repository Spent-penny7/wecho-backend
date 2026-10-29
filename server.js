// Wecho GPS ingestion service.
//
// A physical GPS tracker (or our simulator) sends location pings here.
// This server validates the ping, finds the vehicle that tracker is
// linked to, and writes the location straight into Firestore using
// admin privileges (bypassing the client-side security rules, which
// are meant to restrict what a signed-in *user's phone* can touch, not
// what this trusted server can do).
//
// Run locally with: npm start
// (Simulate pings against it with: npm run simulate)

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const https = require('https');
const { normalizeTraccarPosition } = require('./traccar_adapter');
require('dotenv').config();

// ---- Firebase Admin setup ----
// For production (Render), use environment variables
// For local development, use serviceAccountKey.json file
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  // Production: Use environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  // Development: Use local file
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (error) {
    console.error('FATAL: Firebase service account key not found. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable or provide serviceAccountKey.json file');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ---- Express app ----
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const SPEED_ALERT_KMH = 80;
const LOW_BATTERY_PERCENT = 20;
const OFFLINE_AFTER_MS = 2 * 60 * 1000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const hasPaystackSecret = Boolean(
  PAYSTACK_SECRET_KEY && !PAYSTACK_SECRET_KEY.includes('your_paystack_secret_key_here'),
);
const TRACCAR_URL = (process.env.TRACCAR_URL || '').replace(/\/+$/, '');
const TRACCAR_USERNAME = process.env.TRACCAR_USERNAME;
const TRACCAR_PASSWORD = process.env.TRACCAR_PASSWORD;
const TRACCAR_SYNC_INTERVAL_MS = Math.max(
  5000,
  Number.parseInt(process.env.TRACCAR_SYNC_INTERVAL_MS || '10000', 10) || 10000,
);
const hasTraccarConfig = Boolean(TRACCAR_URL && TRACCAR_USERNAME && TRACCAR_PASSWORD);
let traccarSyncInProgress = false;

function distanceInMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function writeAlert(vehicleDoc, { type, title, detail }) {
  const ownerId = vehicleDoc.data().ownerId;
  const userSnapshot = await db.collection('users').doc(ownerId).get();
  const preferences = userSnapshot.data()?.notificationPreferences || {};
  const preferenceByType = {
    speed: 'speedAlerts',
    geofence_entry: 'geofenceAlerts',
    geofence_exit: 'geofenceAlerts',
    ignition: 'ignitionAlerts',
    battery: 'batteryAlerts',
    parked_movement: 'parkedMovementAlerts',
  };
  await db.collection('alerts').add({
    ownerId,
    vehicleId: vehicleDoc.id,
    type,
    title,
    detail,
    read: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  const preferenceKey = preferenceByType[type];
  if (preferences.pushEnabled === false ||
      (preferenceKey && preferences[preferenceKey] === false)) return;

  const tokenSnapshot = await db
    .collection('users')
    .doc(ownerId)
    .collection('fcmTokens')
    .get();
  const tokens = tokenSnapshot.docs
    .map((doc) => doc.data().token)
    .filter((token) => typeof token === 'string' && token.length > 0);
  if (tokens.length === 0) return;

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body: detail },
    data: { type, vehicleId: vehicleDoc.id },
    android: {
      notification: {
        channelId: preferences.sound !== false
          ? 'wecho_activity'
          : preferences.vibration !== false
              ? 'wecho_vibrate'
              : 'wecho_silent',
      },
    },
  });
  const invalidTokens = response.responses
    .map((result, index) => result.success ? null : tokens[index])
    .filter((token) => token != null);
  await Promise.all(invalidTokens.map((token) =>
    db.collection('users').doc(ownerId).collection('fcmTokens').doc(token).delete()));
}

async function evaluateAlerts(vehicleDoc, { lat, lng, speed, ignition, battery }) {
  const previous = vehicleDoc.data();
  const previousSpeed = typeof previous.speed === 'number' ? previous.speed : 0;

  // 1. Movement When Parked Alert (Anti-theft / unauthorized towing)
  const wasParked = previous.ignition === false || previousSpeed === 0;
  const hasDisplacement = typeof previous.lat === 'number' && typeof previous.lng === 'number'
    && distanceInMeters(lat, lng, previous.lat, previous.lng) > 40;
  const isMovingWhileParked = (speed > 5 || hasDisplacement) && (ignition === false || (!ignition && previous.ignition === false));
  
  if (wasParked && isMovingWhileParked) {
    await writeAlert(vehicleDoc, {
      type: 'parked_movement',
      title: '🚨 Movement Detected While Parked',
      detail: `${previous.name || 'Vehicle'} detected moving while parked/ignition off! Possible theft or towing.`,
    });
  }

  // 2. Speed alert
  if (speed > SPEED_ALERT_KMH && previousSpeed <= SPEED_ALERT_KMH) {
    await writeAlert(vehicleDoc, {
      type: 'speed',
      title: 'Speed Alert',
      detail: `${previous.name || 'Vehicle'} exceeded ${SPEED_ALERT_KMH} km/h`,
    });
  }

  // 3. Ignition toggle
  if (typeof ignition === 'boolean' && ignition !== previous.ignition) {
    await writeAlert(vehicleDoc, {
      type: 'ignition',
      title: ignition ? 'Ignition On' : 'Ignition Off',
      detail: `${previous.name || 'Vehicle'} ignition turned ${ignition ? 'on' : 'off'}`,
    });
  }

  // 4. Low battery
  if (typeof battery === 'number' && battery < LOW_BATTERY_PERCENT
      && (typeof previous.battery !== 'number' || previous.battery >= LOW_BATTERY_PERCENT)) {
    await writeAlert(vehicleDoc, {
      type: 'battery',
      title: 'Low Tracker Battery',
      detail: `${previous.name || 'Vehicle'} tracker battery is at ${battery}%`,
    });
  }

  // 5. Geofence entries & exits
  const geofences = await vehicleDoc.ref.collection('geofences').get();
  for (const geofence of geofences.docs) {
    const zone = geofence.data();
    if (zone.active === false) continue;
    if (typeof zone.centerLat !== 'number' || typeof zone.centerLng !== 'number' || typeof zone.radiusMeters !== 'number') continue;
    const distance = distanceInMeters(lat, lng, zone.centerLat, zone.centerLng);
    const inside = distance <= zone.radiusMeters;
    const wasInside = previous.geofenceStates?.[geofence.id] === true;
    if (inside !== wasInside) {
      await writeAlert(vehicleDoc, {
        type: inside ? 'geofence_entry' : 'geofence_exit',
        title: inside ? 'Geofence Entry' : 'Geofence Exit',
        detail: `${previous.name || 'Vehicle'} ${inside ? 'entered' : 'left'} ${zone.name || 'zone'}`,
      });
    }
    await vehicleDoc.ref.update({ [`geofenceStates.${geofence.id}`]: inside });
  }
}

async function ingestPosition(position) {
  const snapshot = await db.collection('vehicles')
    .where('trackerId', '==', position.trackerId)
    .limit(2)
    .get();

  if (snapshot.empty) {
    return { status: 404, error: `No vehicle is linked to trackerId "${position.trackerId}".` };
  }
  if (snapshot.size > 1) {
    return { status: 409, error: 'Tracker ID is linked to multiple vehicles.' };
  }

  const vehicleDoc = snapshot.docs[0];
  const previous = vehicleDoc.data();
  if (position.source === 'traccar' && position.positionId
      && previous.lastTraccarPositionId === position.positionId) {
    return { status: 200, ok: true, vehicleId: vehicleDoc.id, duplicate: true };
  }

  const positionTimestamp = position.timestamp
    ? admin.firestore.Timestamp.fromDate(position.timestamp)
    : admin.firestore.FieldValue.serverTimestamp();
  const update = {
    status: 'online',
    lat: position.lat,
    lng: position.lng,
    speed: position.speed,
    ...(typeof position.ignition === 'boolean'
      ? { ignition: position.ignition }
      : {}),
    ...(typeof position.battery === 'number'
      ? { battery: position.battery }
      : {}),
    lastSeen: positionTimestamp,
    ...(position.source === 'traccar' && position.positionId
      ? { lastTraccarPositionId: position.positionId }
      : {}),
  };

  await vehicleDoc.ref.update(update);
  await evaluateAlerts(vehicleDoc, position);
  await vehicleDoc.ref.collection('locations').add({
    lat: position.lat,
    lng: position.lng,
    speed: position.speed,
    timestamp: positionTimestamp,
  });

  return { status: 200, ok: true, vehicleId: vehicleDoc.id };
}

async function syncTraccarPositions() {
  if (!hasTraccarConfig || traccarSyncInProgress) return;
  traccarSyncInProgress = true;

  try {
    const authorization = `Basic ${Buffer.from(
      `${TRACCAR_USERNAME}:${TRACCAR_PASSWORD}`,
    ).toString('base64')}`;
    const requestOptions = {
      headers: { Authorization: authorization, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    };
    const [devicesResponse, positionsResponse] = await Promise.all([
      fetch(`${TRACCAR_URL}/api/devices`, requestOptions),
      fetch(`${TRACCAR_URL}/api/positions`, requestOptions),
    ]);

    if (!devicesResponse.ok || !positionsResponse.ok) {
      throw new Error(
        `Traccar API returned ${devicesResponse.status}/${positionsResponse.status}`,
      );
    }

    const [devices, positions] = await Promise.all([
      devicesResponse.json(),
      positionsResponse.json(),
    ]);
    if (!Array.isArray(devices) || !Array.isArray(positions)) {
      throw new Error('Traccar API returned an unexpected response.');
    }

    const devicesById = new Map(devices.map((device) => [String(device.id), device]));
    for (const traccarPosition of positions) {
      const device = devicesById.get(String(traccarPosition.deviceId));
      const normalized = normalizeTraccarPosition(device, traccarPosition);
      if (!normalized) continue;

      const result = await ingestPosition({ ...normalized, source: 'traccar' });
      if (result.status === 409) {
        console.error(`${result.error} Traccar uniqueId: ${normalized.trackerId}`);
      }
    }
  } catch (error) {
    console.error('Traccar sync failed:', error.message);
  } finally {
    traccarSyncInProgress = false;
  }
}

async function markStaleVehiclesOffline() {
  const snapshot = await db.collection('vehicles')
    .where('status', '==', 'online')
    .get();
  const cutoff = Date.now() - OFFLINE_AFTER_MS;
  const updates = [];
  for (const vehicle of snapshot.docs) {
    const lastSeen = vehicle.data().lastSeen;
    if (!lastSeen || typeof lastSeen.toMillis !== 'function') continue;
    if (lastSeen.toMillis() < cutoff) {
      updates.push(vehicle.ref.update({ status: 'offline' }));
    }
  }
  await Promise.all(updates);
  if (updates.length > 0) {
    console.log(`Marked ${updates.length} stale vehicle(s) offline`);
  }
}

// Health check — hit this in a browser to confirm the server is running.
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'wecho-ingestion',
    integrations: { traccar: hasTraccarConfig },
  });
});

// Initialize payment endpoint — calls Paystack API to start a transaction
app.post('/initialize-payment', async (req, res) => {
  if (!hasPaystackSecret) {
    return res.status(503).json({ error: 'Payments are not configured.' });
  }

  const { email, amount, reference, metadata, callback_url, plan } = req.body;

  if (!email || !amount || !reference) {
    return res.status(400).json({ error: 'email, amount, and reference are required.' });
  }

  try {
    const initializeOptions = {
      hostname: 'api.paystack.co',
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const initializeReq = https.request(initializeOptions, (initializeRes) => {
      let data = '';

      initializeRes.on('data', (chunk) => {
        data += chunk;
      });

      initializeRes.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('Payment initialization response:', response);
          return res.json(response);
        } catch (parseError) {
          console.error('Error parsing Paystack response:', parseError);
          return res.status(500).json({ error: 'Error processing payment initialization' });
        }
      });
    });

    initializeReq.on('error', (error) => {
      console.error('Error initializing payment:', error);
      return res.status(500).json({ error: 'Payment initialization error' });
    });

    const payload = {
      email,
      amount,
      reference,
      metadata,
    };
    if (callback_url) {
      payload.callback_url = callback_url;
    }
    if (plan) {
      payload.plan = plan;
    }

    initializeReq.write(JSON.stringify(payload));

    initializeReq.end();

  } catch (error) {
    console.error('Payment initialization error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Payment verification endpoint — verifies Paystack transaction and updates subscription
app.post('/verify-payment', async (req, res) => {
  if (!hasPaystackSecret) {
    return res.status(503).json({ error: 'Payments are not configured.' });
  }

  const { reference, userId, planId, billingCycle } = req.body;

  if (!reference || !userId || !planId || !billingCycle) {
    return res.status(400).json({ error: 'reference, userId, planId, and billingCycle are required.' });
  }

  try {
    // Verify transaction with Paystack
    const verifyUrl = `https://api.paystack.co/transaction/verify/${reference}`;
    
    const verifyOptions = {
      hostname: 'api.paystack.co',
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const verifyRequest = https.request(verifyOptions, (verifyRes) => {
      let data = '';

      verifyRes.on('data', (chunk) => {
        data += chunk;
      });

      verifyRes.on('end', async () => {
        try {
          const response = JSON.parse(data);
          
          if (response.status && response.data.status === 'success') {
            // Transaction verified successfully - update user subscription
            const now = admin.firestore.FieldValue.serverTimestamp();
            const subscriptionEndDate = billingCycle === 'yearly'
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await db.collection('users').doc(userId).update({
              'plan': planId,
              'subscription': {
                'billingCycle': billingCycle,
                'startDate': now,
                'endDate': subscriptionEndDate,
                'lastTransactionReference': reference,
                'status': 'active',
                'paystackPlan': response.data.plan || null,
                'customerCode': response.data.customer?.customer_code || null,
              },
            });

            console.log(`Payment verified and subscription updated for user ${userId}`);
            return res.json({ 
              success: true, 
              message: 'Payment verified and subscription updated',
              planId,
              billingCycle,
              endDate: subscriptionEndDate,
            });
          } else {
            console.log(`Payment verification failed for reference ${reference}`);
            return res.status(400).json({ 
              error: 'Payment verification failed',
              details: response.message,
            });
          }
        } catch (parseError) {
          console.error('Error parsing Paystack response:', parseError);
          return res.status(500).json({ error: 'Error processing payment verification' });
        }
      });
    });

    verifyRequest.on('error', (error) => {
      console.error('Error verifying payment:', error);
      return res.status(500).json({ error: 'Payment verification error' });
    });

    verifyRequest.end();

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Main endpoint. A tracker calls this whenever it has a new fix.
// Body: { trackerId: string, lat: number, lng: number, speed?: number }
app.post('/ping', async (req, res) => {
  const { trackerId, lat, lng, speed = 0, ignition, battery } = req.body || {};
  const normalizedTrackerId = typeof trackerId === 'string' ? trackerId.trim() : '';

  if (!normalizedTrackerId || typeof lat !== 'number' || !Number.isFinite(lat)
      || lat < -90 || lat > 90 || typeof lng !== 'number'
      || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({
      error: 'trackerId and valid numeric lat/lng coordinates are required.',
    });
  }
  if (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0) {
    return res.status(400).json({ error: 'speed must be a non-negative number.' });
  }
  if (ignition !== undefined && typeof ignition !== 'boolean') {
    return res.status(400).json({ error: 'ignition must be a boolean when provided.' });
  }
  if (battery !== undefined && (typeof battery !== 'number'
      || !Number.isFinite(battery) || battery < 0 || battery > 100)) {
    return res.status(400).json({ error: 'battery must be between 0 and 100.' });
  }

  try {
    const result = await ingestPosition({
      trackerId: normalizedTrackerId,
      lat,
      lng,
      speed,
      ignition,
      battery,
      timestamp: null,
      source: 'http',
    });
    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    console.log(`Ping OK — tracker ${normalizedTrackerId} → vehicle ${result.vehicleId} (${lat}, ${lng})`);
    return res.json({ ok: true, vehicleId: result.vehicleId });
  } catch (err) {
    console.error('Error handling ping:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Wecho ingestion service running on port ${PORT}`);
  setInterval(() => {
    markStaleVehiclesOffline().catch((error) => {
      console.error('Offline sweep failed:', error);
    });
  }, 30 * 1000);

  if (hasTraccarConfig) {
    console.log(`Traccar sync enabled; polling every ${TRACCAR_SYNC_INTERVAL_MS} ms`);
    syncTraccarPositions();
    setInterval(syncTraccarPositions, TRACCAR_SYNC_INTERVAL_MS);
  } else {
    console.log('Traccar sync disabled; configure TRACCAR_URL and API credentials to enable it');
  }
});
