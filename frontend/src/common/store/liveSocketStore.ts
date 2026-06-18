import { create } from 'zustand';

export interface EventObject {
  event: string;
  eventId: any;
  type: string;
  status?: 'success' | 'info' | 'warning' | 'error';
  data: any;
  timestamp: Date;
}

interface EventStore {
  event: EventObject | null;
  addEvent: (event: EventObject) => void;
  removeEvent: (eventId: any) => void;
  clearEvent: () => void;
}

export const useLiveSocketDataStore = create<EventStore>((set) => ({
  event: null,
  addEvent: (event) =>
    set(() => ({
      event: event,
    })),
  removeEvent: (eventId) =>
    set((state) => ({
      event: state.event && state.event.eventId === eventId ? null : state.event,
    })),
  clearEvent: () =>
    set(() => ({
      event: null,
    })),
}));