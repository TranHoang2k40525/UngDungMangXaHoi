// TabRefreshEmitter.js
// Event emitter đơn giản để xử lý triple tap trên tab để refresh
// Tương thích với React Native (không dùng Node.js EventEmitter)

// Simple EventEmitter implementation cho React Native
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  off(eventName, callback) {
    if (!this.events[eventName]) return;
    this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
  }

  emit(eventName, ...args) {
    if (!this.events[eventName]) return;
    this.events[eventName].forEach(callback => {
      callback(...args);
    });
  }

  removeAllListeners(eventName) {
    if (eventName) {
      delete this.events[eventName];
    } else {
      this.events = {};
    }
  }
}

const emitter = new SimpleEventEmitter();

/**
 * Đăng ký listener cho sự kiện triple tap trên tab
 * @param {string} tabName - Tên tab (Home, Video, Profile, Search)
 * @param {function} callback - Callback function khi triple tap
 * @returns {function} - Unsubscribe function
 */
export const onTabTriple = (tabName, callback) => {
  const eventName = `tab:triple:${tabName}`;
  emitter.on(eventName, callback);
  
  // Return unsubscribe function
  return () => {
    emitter.off(eventName, callback);
  };
};

/**
 * Emit sự kiện triple tap
 * @param {string} tabName - Tên tab được triple tap
 */
export const emitTabTriple = (tabName) => {
  const eventName = `tab:triple:${tabName}`;
  emitter.emit(eventName);
};

/**
 * Remove tất cả listeners của một tab
 * @param {string} tabName - Tên tab
 */
export const removeAllTabListeners = (tabName) => {
  const eventName = `tab:triple:${tabName}`;
  emitter.removeAllListeners(eventName);
};

export default {
  onTabTriple,
  emitTabTriple,
  removeAllTabListeners,
};
