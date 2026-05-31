/**
 * EventEmitter.ts
 * A browser-safe, fully-typed custom implementation of the Node.js EventEmitter.
 * Solves browser-compatibility compilation constraints during Vite builds,
 * enabling seamless execution on both client tablets and backend servers.
 */

export class EventEmitter {
  private listeners: Record<string, Function[]> = {};

  /**
   * Registers a listener callback for a specific event
   */
  public on(event: string, listener: Function): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  /**
   * Unregisters a specific listener callback for an event
   */
  public off(event: string, listener: Function): this {
    if (!this.listeners[event]) return this;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    return this;
  }

  /**
   * Registers a listener callback that triggers at most once
   */
  public once(event: string, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      listener(...args);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Synchronously calls each of the listeners registered for the event
   */
  public emit(event: string, ...args: any[]): boolean {
    if (!this.listeners[event] || this.listeners[event].length === 0) {
      return false;
    }
    // Create a shallow copy of listeners to prevent issues if a listener modifies the array
    const eventListeners = [...this.listeners[event]];
    eventListeners.forEach(listener => {
      try {
        listener(...args);
      } catch (e) {
        console.error(`EventEmitter callback error for event "${event}":`, e);
      }
    });
    return true;
  }

  /**
   * Alias for off()
   */
  public removeListener(event: string, listener: Function): this {
    return this.off(event, listener);
  }

  /**
   * Removes all listeners, or those of the specified event
   */
  public removeAllListeners(event?: string): this {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
    return this;
  }
}
