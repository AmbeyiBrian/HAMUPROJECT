// A simple event emitter for cross-component communication
class EventEmitter {
  constructor() {
    this.events = {};
  }

  // Subscribe to an event
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return () => this.removeListener(event, listener);
  }

  // Remove a listener
  removeListener(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  // Emit an event with data
  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  // Clear all listeners for an event
  clear(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// Create a singleton instance
const eventEmitter = new EventEmitter();

// Add to global scope so it can be accessed by imported modules
global.EventEmitter = eventEmitter;

export default eventEmitter;