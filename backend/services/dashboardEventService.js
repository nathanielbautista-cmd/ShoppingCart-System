const { EventEmitter } = require('events');

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

let latestEventId = 0;

const publishDashboardUpdate = (reason, details = {}) => {
  const event = {
    id: String(++latestEventId),
    reason,
    details,
    occurredAt: new Date().toISOString()
  };

  emitter.emit('dashboard:update', event);
  return event;
};

const subscribeToDashboardUpdates = (listener) => {
  emitter.on('dashboard:update', listener);
  return () => emitter.off('dashboard:update', listener);
};

const getLatestDashboardEventId = () => String(latestEventId);

module.exports = {
  publishDashboardUpdate,
  subscribeToDashboardUpdates,
  getLatestDashboardEventId
};
