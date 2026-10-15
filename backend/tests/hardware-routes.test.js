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

test('kiosk alarm state is exposed to the Raspberry Pi output poller', async () => {
  const enableResponse = await fetch(`${baseUrl}/alarm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: true }),
  });
  assert.equal(enableResponse.status, 202);

  const activeResponse = await fetch(`${baseUrl}/outputs`);
  const activeState = await activeResponse.json();
  assert.equal(activeState.alarmActive, true);

  const disableResponse = await fetch(`${baseUrl}/alarm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: false }),
  });
  assert.equal(disableResponse.status, 202);

  const inactiveResponse = await fetch(`${baseUrl}/outputs`);
  const inactiveState = await inactiveResponse.json();
  assert.equal(inactiveState.alarmActive, false);
});

test('kiosk alarm endpoint rejects a non-boolean state', async () => {
  const response = await fetch(`${baseUrl}/alarm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: 'yes' }),
  });
  assert.equal(response.status, 400);
});

test('load-cell publisher connects to the weight endpoint and exposes health', async () => {
  const postResponse = await fetch(`${baseUrl}/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grams: 412.34,
      stable: true,
      spreadGrams: 2.25,
      sampleCount: 13,
      sensorCount: 1,
      sensorIds: ['hx711_1'],
      deviceId: 'cart-pi-01',
      measuredAt: new Date().toISOString(),
    }),
  });
  assert.equal(postResponse.status, 202);

  const weightResponse = await fetch(`${baseUrl}/weight`);
  assert.equal(weightResponse.status, 200);
  const weight = await weightResponse.json();
  assert.equal(weight.reading.grams, 412.3);
  assert.equal(weight.reading.stable, true);
  assert.deepEqual(weight.reading.sensorIds, ['hx711_1']);
  assert.equal(weight.reading.deviceId, 'cart-pi-01');

  const statusResponse = await fetch(`${baseUrl}/weight-status`);
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.equal(status.connected, true);
  assert.equal(status.reading.grams, 412.3);
});

test('signed load-cell drift is preserved for small delta detection', async () => {
  const response = await fetch(`${baseUrl}/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grams: -8.4, stable: true }),
  });
  assert.equal(response.status, 202);
  const body = await response.json();
  assert.equal(body.reading.grams, -8.4);
});
