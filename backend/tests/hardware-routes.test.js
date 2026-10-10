const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const express = require('express');
const hardwareRoutes = require('../routes/hardwareRoutes');

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/hardware', hardwareRoutes);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/hardware`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('power state and delete button events reach the touchscreen queue', async () => {
  const powerResponse = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'power_on' }),
  });
  assert.equal(powerResponse.status, 202);

  const deleteResponse = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete_product' }),
  });
  assert.equal(deleteResponse.status, 202);

  const queueResponse = await fetch(`${baseUrl}/events?after=0`);
  const queue = await queueResponse.json();
  assert.equal(queue.powered, true);
  assert.deepEqual(queue.events.map((event) => event.action), [
    'power_on',
    'delete_product',
  ]);
});

test('unsupported button events are rejected', async () => {
  const response = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unknown_button' }),
  });
  assert.equal(response.status, 400);
});
