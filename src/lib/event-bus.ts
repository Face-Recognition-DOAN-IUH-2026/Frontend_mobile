type Handler = (...args: any[]) => void;

class EventBus {
  private listeners: Record<string, Handler[]> = {};

  on(event: string, handler: Handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler) {
    const handlers = this.listeners[event];
    if (!handlers) return;
    this.listeners[event] = handlers.filter((h) => h !== handler);
  }

  emit(event: string, ...args: any[]) {
    this.listeners[event]?.forEach((h) => h(...args));
  }

  removeAll(event?: string) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

export const bus = new EventBus();
export default bus;
