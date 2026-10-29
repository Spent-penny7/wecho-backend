const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTraccarPosition } = require('./traccar_adapter');

const device = { id: 7, uniqueId: 'tracker-123' };

test('normalizes Traccar coordinates, speed, attributes, and time', () => {
  const position = normalizeTraccarPosition(device, {
    id: 99,
    deviceId: 7,
    latitude: 6.5244,
    longitude: 3.3792,
    speed: 10,
    fixTime: '2026-10-01T12:00:00.000Z',
    attributes: { ignition: true, batteryLevel: 82 },
  });

  assert.equal(position.trackerId, 'tracker-123');
  assert.equal(position.lat, 6.5244);
  assert.equal(position.lng, 3.3792);
  assert.equal(position.speed, 18.52);
  assert.equal(position.ignition, true);
  assert.equal(position.battery, 82);
  assert.equal(position.positionId, '99');
  assert.equal(position.timestamp.toISOString(), '2026-10-01T12:00:00.000Z');
});

test('ignores invalid fixes and positions for a different device', () => {
  const validPosition = {
    id: 99,
    deviceId: 7,
    latitude: 6,
    longitude: 3,
    speed: 0,
  };

  assert.equal(
    normalizeTraccarPosition(device, { ...validPosition, valid: false }),
    null,
  );
  assert.equal(
    normalizeTraccarPosition(device, { ...validPosition, outdated: true }),
    null,
  );
  assert.equal(
    normalizeTraccarPosition(device, { ...validPosition, latitude: 91 }),
    null,
  );
  assert.equal(
    normalizeTraccarPosition(device, { ...validPosition, deviceId: 8 }),
    null,
  );
});