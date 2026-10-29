const KNOTS_TO_KMH = 1.852;

function normalizeTraccarPosition(device, position) {
  if (!device || !position || String(device.id) !== String(position.deviceId)) {
    return null;
  }

  const trackerId = typeof device.uniqueId === 'string'
    ? device.uniqueId.trim()
    : '';
  const { latitude, longitude, speed } = position;
  if (!trackerId || position.valid === false
      || position.outdated === true
      || typeof latitude !== 'number' || !Number.isFinite(latitude)
      || latitude < -90 || latitude > 90
      || typeof longitude !== 'number' || !Number.isFinite(longitude)
      || longitude < -180 || longitude > 180
      || typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0) {
    return null;
  }

  const attributes = position.attributes || {};
  const timestampValue = position.fixTime || position.deviceTime || position.serverTime;
  const timestamp = timestampValue ? new Date(timestampValue) : null;
  const battery = attributes.batteryLevel;

  return {
    trackerId,
    lat: latitude,
    lng: longitude,
    speed: speed * KNOTS_TO_KMH,
    ignition: typeof attributes.ignition === 'boolean'
      ? attributes.ignition
      : undefined,
    battery: typeof battery === 'number' && Number.isFinite(battery)
        && battery >= 0 && battery <= 100
      ? battery
      : undefined,
    positionId: position.id == null ? null : String(position.id),
    timestamp: timestamp && Number.isFinite(timestamp.getTime())
      ? timestamp
      : null,
  };
}

module.exports = { normalizeTraccarPosition };