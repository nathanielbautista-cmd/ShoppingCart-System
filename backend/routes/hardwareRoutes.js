const express = require('express');




const router = express.Router();
const validActions = new Set([
  'power_on',
  'power_off',
  'restart',
  'add_product',
  'delete_product',
  // Keep accepting events from Pi installations using the older action name.
  'remove_product'
]);
let nextId = 1;
let events = [];
let latestWeight = null;
let powered = null;
let alarmActive = false;
let alarmUpdatedAt = null;

const MAX_WEIGHT_READING_AGE_MS = Number(process.env.HARDWARE_WEIGHT_MAX_AGE_MS) || 5000;

const getWeightConnection = () => {
  if (!latestWeight) {
    return {
      connected: false,
      ageMs: null,
      message: 'No HX711 reading is available. Start the load-cell service on the Raspberry Pi.'
    };
  }

  const ageMs = Date.now() - Date.parse(latestWeight.receivedAt);
  if (!Number.isFinite(ageMs) || ageMs > MAX_WEIGHT_READING_AGE_MS) {
    return {
      connected: false,
      ageMs: Number.isFinite(ageMs) ? ageMs : null,
      message: 'The HX711 reading is stale. Check the load-cell service connection.'
    };
  }

  return { connected: true, ageMs, message: 'HX711 load-cell service is connected.' };
};

router.post('/events', (req, res) => {
  const { action } = req.body || {};
  if (!validActions.has(action)) {
    return res.status(400).json({ success: false, message: 'Unsupported hardware action' });
  }
  const event = { id: nextId++, action, createdAt: new Date().toISOString() };
  events.push(event);

  if (action === 'power_on') powered = true;
  if (action === 'power_off') powered = false;

  if (events.length > 100) events = events.slice(-100);
  res.status(202).json({ success: true, event });
});

router.get('/events', (req, res) => {
  const after = Number(req.query.after || 0);
  res.json({
    success: true,
    latestId: nextId - 1,
    powered,
    events: events.filter((event) => event.id > after)
  });
});

router.post('/alarm', (req, res) => {
  if (typeof req.body?.active !== 'boolean') {
    return res.status(400).json({ success: false, message: 'active must be a boolean' });
  }

  alarmActive = req.body.active;
  alarmUpdatedAt = new Date().toISOString();
  return res.status(202).json({ success: true, alarmActive, alarmUpdatedAt });
});

// Polled by the Raspberry Pi GPIO service. Keeping this separate from button
// events makes browser-to-hardware state idempotent and safe to retry.
router.get('/outputs', (_req, res) => {
  return res.json({ success: true, alarmActive, alarmUpdatedAt });
});




router.post('/weight', (req, res) => {
  const grams = Number(req.body?.grams);
  const stable = req.body?.stable === true;

  if (!Number.isFinite(grams)) {
    return res.status(400).json({ success: false, message: 'grams must be a finite number' });
  }

  const sensorCount = Number(req.body?.sensorCount);
  const sampleCount = Number(req.body?.sampleCount);
  const spreadGrams = Number(req.body?.spreadGrams);

  latestWeight = {
    grams: Number(grams.toFixed(1)),
    stable,
    spreadGrams: Number.isFinite(spreadGrams) ? Number(spreadGrams.toFixed(1)) : 0,
    sampleCount: Number.isFinite(sampleCount) && sampleCount >= 0 ? Math.trunc(sampleCount) : 0,
    sensorCount: Number.isFinite(sensorCount) && sensorCount > 0 ? Math.trunc(sensorCount) : 1,
    sensorIds: Array.isArray(req.body?.sensorIds)
      ? req.body.sensorIds.filter((value) => typeof value === 'string').slice(0, 8)
      : [],
    deviceId: typeof req.body?.deviceId === 'string'
      ? req.body.deviceId.trim().slice(0, 80)
      : '',
    measuredAt: req.body?.measuredAt || new Date().toISOString(),
    receivedAt: new Date().toISOString()
  };

  return res.status(202).json({ success: true, reading: latestWeight });
});

router.get('/weight', (req, res) => {
  const connection = getWeightConnection();
  if (!connection.connected) {
    return res.status(503).json({ success: false, ...connection });
  }

  return res.json({ success: true, ageMs: connection.ageMs, reading: latestWeight });
});

// Unlike GET /weight this endpoint always returns 200, allowing the kiosk to
// show a useful online/offline badge without treating an unplugged scale as an
// application error.
router.get('/weight-status', (req, res) => {
  const connection = getWeightConnection();
  return res.json({
    success: true,
    ...connection,
    maxAgeMs: MAX_WEIGHT_READING_AGE_MS,
    reading: latestWeight
  });
});

module.exports = router;
