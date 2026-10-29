# Wecho GPS Ingestion Backend

This service writes normalized tracker positions to Firestore and processes speed, ignition, battery, and geofence alerts. It supports direct HTTP/JSON reports for development and can poll a Traccar server for broad multi-protocol device support.

## Setup

Run from `C:\dev\wecho_backend`:

```powershell
npm install
```

Place a Firebase Admin service-account file beside `server.js` as `serviceAccountKey.json`. Keep it private and out of source control. `PAYSTACK_SECRET_KEY` is optional for GPS ingestion; payment routes return `503` until a real key is configured. The `.env` file is ignored by git.

## Run locally

```powershell
npm start
```

The health check is `http://localhost:4000/` and should return `{"status":"ok","service":"wecho-ingestion"}`.

Pair a vehicle in the app by entering the tracker's exact device ID. A compatible tracker or vendor gateway must POST to `http://<backend-host>:4000/ping` with `Content-Type: application/json` and a body in this form:

```json
{"trackerId":"DEVICE_ID","lat":6.5244,"lng":3.3792,"speed":0,"ignition":false,"battery":95}
```

`trackerId`, `lat`, and `lng` are required. Coordinates must be valid decimal degrees. `speed` is km/h (default `0`); `ignition` is boolean; `battery` is a percentage from 0 to 100. Optional fields may be omitted. Successful reports mark the vehicle online, update its last fix, append to `locations`, and evaluate alerts. Vehicles with no report for two minutes are marked offline while the backend process is running.

## Broad device support with Traccar

Traccar supports a large catalog of tracker protocols. Instead of teaching Wecho each device's binary/TCP protocol, configure compatible hardware to report to your Traccar server. Check the device's Traccar protocol page for the correct server port and setup commands. Add each device in Traccar, and use that device's `uniqueId` as the tracker ID when linking it in Wecho.

Configure the Wecho backend with the Traccar server's base URL and a dedicated read-only API account. Add these settings to the backend `.env` file (or your hosting provider's environment settings):

```dotenv
TRACCAR_URL=https://traccar.example.com
TRACCAR_USERNAME=wecho-readonly-user
TRACCAR_PASSWORD=use-a-long-unique-password
TRACCAR_SYNC_INTERVAL_MS=10000
```

Restart Wecho backend. Its logs should say `Traccar sync enabled`. Every sync, Wecho reads `/api/devices` and `/api/positions`, matches Traccar's device `uniqueId` against the ID linked in Wecho, and writes new valid positions. Repeated Traccar position IDs are ignored. Traccar reports speed in knots; Wecho converts it to km/h. Only latest positions are synchronized at each poll, so very frequent tracker updates may not all appear in trip history.

The Flutter app still needs the Wecho backend's base URL, not the Traccar URL:

```powershell
flutter run -d <device-id> --dart-define="WECHO_API_BASE_URL=https://<your-wecho-backend>"
```

Keep Traccar API credentials only on the Wecho backend; never put them in the app. Use HTTPS between Wecho and Traccar and a read-only Traccar account. Devices that are unsupported by Traccar or can report only through a proprietary vendor cloud still need a vendor-specific adapter. This integration has not yet been tested against physical tracker hardware.

## Test with the simulator

In a second PowerShell terminal, use the exact ID linked in the app:

```powershell
node simulate.js <trackerId>
```

For a backend on another host, set `SERVER_URL` before running the simulator, for example:

```powershell
$env:SERVER_URL = 'https://<your-backend-host>/ping'
node simulate.js <trackerId>
```

Each simulated ping is synthetic movement around Port Harcourt. It is only a pipeline test, not a real vehicle fix.

## Network and security

The backend host must be reachable from the tracker. A LAN address is usable only on that local network; trackers using cellular data need a deployed public HTTPS service. Configure the Flutter app with the same backend base URL using `--dart-define=WECHO_API_BASE_URL=https://<your-backend-host>`.

The current `/ping` endpoint matches by tracker ID and does not authenticate the sender. Keep it on a trusted test network; do not expose it to the public internet for production tracking until per-device authentication and TLS deployment are in place. Many commercial trackers use vendor-specific TCP protocols or send data to a vendor cloud. Those require a gateway/protocol adapter; they will not work by entering an ID alone. The precise adapter depends on the tracker make/model and protocol documentation.

## Troubleshooting

- `404` from `/ping`: the ID in the report does not exactly match a vehicle's linked tracker ID.
- `409` from `/ping`: the same tracker ID is linked to multiple vehicles; remove the duplicate link.
- `400` from `/ping`: verify numeric latitude/longitude ranges and optional field types.
- No reports reach the backend: confirm the tracker supports HTTP POST with the documented JSON fields and that it can reach the backend URL from its network.
- Firebase credential errors: confirm `serviceAccountKey.json` is in the backend folder and belongs to the same Firebase project used by the app.
