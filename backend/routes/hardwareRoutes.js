const express = require('express');

// The Pi GPIO process posts small button events here.  Keeping this queue in
// memory is intentional: button presses are transient UI commands, not cart
// records that need to be stored in MongoDB.
const router = express.Router();
const validActions = new Set(['power_on', 'power_off', 'restart', 'add_product', 'remove_product']);
let nextId = 1;
let events = [];

router.post('/events', (req, res) => {
  const { action } = req.body || {};
  if (!validActions.has(action)) {
    return res.status(400).json({ success: false, message: 'Unsupported hardware action' });
  }
  const event = { id: nextId++, action, createdAt: new Date().toISOString() };
  events.push(event);
  // Bound memory if the touchscreen is offline for a while.
  if (events.length > 100) events = events.slice(-100);
  res.status(202).json({ success: true, event });
});

router.get('/events', (req, res) => {
  const after = Number(req.query.after || 0);
  res.json({ success: true, events: events.filter((event) => event.id > after) });
});

module.exports = router;
