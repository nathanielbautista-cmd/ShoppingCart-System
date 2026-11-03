const assert = require('assert');
const { EventEmitter } = require('events');
const { streamDashboardEvents } = require('../controllers/reportController');
const { publishDashboardUpdate } = require('../services/dashboardEventService');

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.chunks = [];
    this.headers = {};
    this.statusCode = 0;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  set(headers) {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  flushHeaders() {}

  write(chunk) {
    this.chunks.push(String(chunk));
    return true;
  }
}

const req = new EventEmitter();
const res = new MockResponse();

streamDashboardEvents(req, res);
publishDashboardUpdate('test-update', { productId: 'product-1' });
res.emit('close');

const body = res.chunks.join('');
assert.strictEqual(res.statusCode, 200);
assert.strictEqual(res.headers['Content-Type'], 'text/event-stream');
assert.match(body, /event: connected/);
assert.match(body, /event: dashboard-update/);
assert.match(body, /"reason":"test-update"/);
assert.match(body, /"productId":"product-1"/);

console.log('Dashboard SSE stream contract: PASS');
