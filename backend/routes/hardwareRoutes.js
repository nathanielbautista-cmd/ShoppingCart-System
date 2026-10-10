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

const MAX_WEIGHT_READING_AGE_MS = Number(process.env.HARDWARE_WEIGHT_MAX_AGE_MS) || 5000;

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




router.post('/weight', (req, res) => {
  const grams = Number(req.body?.grams);
  const stable = req.body?.stable === true;

  if (!Number.isFinite(grams)) {
    return res.status(400).json({ success: false, message: 'grams must be a finite number' });
  }

  latestWeight = {
    grams: Number(grams.toFixed(1)),
    stable,
    spreadGrams: Number(req.body?.spreadGrams) || 0,
    sampleCount: Number(req.body?.sampleCount) || 0,
    sensorCount: Number(req.body?.sensorCount) || 1,
    measuredAt: req.body?.measuredAt || new Date().toISOString(),
    receivedAt: new Date().toISOString()
  };

  return res.status(202).json({ success: true, reading: latestWeight });
});

router.get('/weight', (req, res) => {
  if (!latestWeight) {
    return res.status(503).json({
      success: false,
      message: 'No HX711 reading is available. Start the load-cell service on the Raspberry Pi.'
    });
  }

  const ageMs = Date.now() - Date.parse(latestWeight.receivedAt);
  if (!Number.isFinite(ageMs) || ageMs > MAX_WEIGHT_READING_AGE_MS) {
    return res.status(503).json({
      success: false,
      message: 'The HX711 reading is stale. Check the load-cell service connection.'
    });
  }

  return res.json({ success: true, ageMs, reading: latestWeight });
});

module.exports = router;
