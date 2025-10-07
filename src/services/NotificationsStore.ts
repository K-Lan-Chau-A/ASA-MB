import { useEffect, useState } from 'react';

type Listener = (count: number) => void;

class NotificationsStore {
  private unreadCount: number = 0;
  private listeners: Set<Listener> = new Set();

  getCount(): number { return this.unreadCount; }

  setCount(n: number): void {
    this.unreadCount = Math.max(0, Number.isFinite(n) ? n : 0);
    for (const l of Array.from(this.listeners)) {
      try { l(this.unreadCount); } catch {}
    }
  }

  inc(delta: number = 1): void { this.setCount(this.unreadCount + delta); }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.unreadCount);
    return () => this.listeners.delete(listener);
  }
}

export const notificationsStore = new NotificationsStore();

export const useUnreadNotifications = (): number => {
  const [cnt, setCnt] = useState<number>(() => notificationsStore.getCount());
  useEffect(() => notificationsStore.subscribe(setCnt), []);
  return cnt;
};


