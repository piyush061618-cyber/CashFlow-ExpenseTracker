type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function notifyDataChanged() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('Listener error on data change:', e);
    }
  });
}

export function subscribeDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

