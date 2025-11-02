const listeners = {};

export function onTabTriple(tabName, fn) {
  if (!listeners[tabName]) listeners[tabName] = new Set();
  listeners[tabName].add(fn);
  return () => listeners[tabName] && listeners[tabName].delete(fn);
}

export function emitTabTriple(tabName) {
  const set = listeners[tabName];
  if (!set) return;
  for (const fn of Array.from(set)) {
    try { fn(); } catch (e) { console.warn('[TabRefreshEmitter] listener error', e); }
  }
}

export default { onTabTriple, emitTabTriple };