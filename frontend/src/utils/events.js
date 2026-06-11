// Custom events for cross-component communication in the same tab

export const Events = {
  PAYROLL_UPDATED: 'payroll_updated',
  CLOCK_SYNC: 'clock_sync',
  ATTENDANCE_UPDATED: 'attendance_updated'
};

export const emitEvent = (eventName, data = null) => {
  const event = new CustomEvent(eventName, { detail: data });
  window.dispatchEvent(event);
};

export const onEvent = (eventName, callback) => {
  window.addEventListener(eventName, (e) => callback(e.detail));
  return () => window.removeEventListener(eventName, callback);
};
