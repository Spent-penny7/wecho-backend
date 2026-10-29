// Pretends to be a physical GPS tracker. Sends a location ping to the
// ingestion server every few seconds, with small realistic movement so
// you can watch a vehicle "drive around" a little.
//
// Usage:
//   node simulate.js <trackerId>
//
// <trackerId> must match the Device ID you entered on the Connect
// Tracker screen for a vehicle in your app.

const trackerId = process.argv[2];

if (!trackerId) {
  console.error('Usage: node simulate.js <trackerId>');
  console.error('(Use the same Device ID you entered in the app\'s Connect Tracker screen.)');
  process.exit(1);
}

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000/ping';

// Starting point: Port Harcourt, Nigeria — change if you'd rather
// simulate somewhere else.
let lat = 4.8156;
let lng = 7.0498;

function jitter() {
  // Small random walk so the "vehicle" appears to move slightly each ping.
  lat += (Math.random() - 0.5) * 0.001;
  lng += (Math.random() - 0.5) * 0.001;
}

async function sendPing() {
  jitter();
  const speed = Math.round(Math.random() * 100); // 0–100 km/h
  const ignition = speed > 0;
  const battery = 15 + Math.round(Math.random() * 80);

  try {
    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId, lat, lng, speed, ignition, battery }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`Sent ping: (${lat.toFixed(5)}, ${lng.toFixed(5)}) @ ${speed} km/h → OK`);
    } else {
      console.error('Server rejected ping:', data);
    }
  } catch (err) {
    console.error('Failed to reach server:', err.message);
  }
}

console.log(`Simulating tracker "${trackerId}" — sending a ping every 5 seconds. Ctrl+C to stop.`);
sendPing();
setInterval(sendPing, 5000);
