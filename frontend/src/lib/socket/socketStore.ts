"use client";

import { create } from 'zustand';
import { initializeSocket, emitEvent, onEvent, cleanupSocket, getSocketStatus, SOCKET } from './socketClient';
import { SIO_EVENTS } from './sioConstants';

// Define types and interfaces
interface SocketStoreState {
  socketStatus: string;
  listeners: Map<string, (...args: any[]) => void>;
  isInitialized: boolean;
  signId: string | null;
  templateId: string | null;
  initialize: (options?: Record<string, unknown>) => void;
  registerConsoleUser: (signId: string) => void;
  listen: (event: string, callback: (...args: any[]) => void) => () => void;
  reconnect: (userId: string) => void;
  cleanup: () => void;
}

const url = process.env.NEXT_PUBLIC_SOCKET_URL as string;

export const useSocketStore = create<SocketStoreState>((set, get) => ({
  socketStatus: SOCKET.DISCONNECTED,
  listeners: new Map<string, (...args: any[]) => void>(),
  isInitialized: false,
  signId: null,
  templateId: null,

  initialize: (options = {}) => {
    const currentStatus = getSocketStatus();
    const { isInitialized, socketStatus } = get();

    if (isInitialized && (currentStatus === SOCKET.CONNECTED || socketStatus === SOCKET.CONNECTING)) {
      return;
    }

    const onStatusChange = (status: string) => {
      set({ socketStatus: status });
      // Reattach listeners when reconnected
      if (status === SOCKET.RECONNECTED || status === SOCKET.CONNECTED) {
        const currentListeners = get().listeners;
        currentListeners.forEach((callback, event) => {
          onEvent(event, callback);
        });

        // Register sign when connected if signId exists
        const { signId } = get();
        if (signId) {
          emitEvent(SIO_EVENTS.REGISTER_CONSOLE_ADMIN, { userId: signId });
        }
      }
    };

    initializeSocket(url, options, onStatusChange);
    set({ isInitialized: true });
  },

  registerConsoleUser: (signId: string) => {
    set({ signId });
    if (getSocketStatus() === SOCKET.CONNECTED) {
      emitEvent(SIO_EVENTS.REGISTER_CONSOLE_ADMIN, { userId: signId });
    }
  },

  listen: (event: string, callback: (...args: any[]) => void) => {
    const currentListeners = get().listeners;
    if (currentListeners.has(event)) {
      console.warn(`[SocketStore] Listener for '${event}' already exists. Replacing it.`);
    }
    
    const wrappedCallback = (...args: any[]) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`[SocketStore] Error in listener '${event}':`, error);
      }
    };
    
    onEvent(event, wrappedCallback);
    set({ listeners: new Map(currentListeners).set(event, wrappedCallback) });

    return () => {
      const updatedListeners = new Map(get().listeners);
      if (updatedListeners.has(event)) {
        updatedListeners.delete(event);
        set({ listeners: updatedListeners });
      }
    };
  },

  reconnect: (userId: string) => {
    set({ signId: userId });
    const { cleanup, initialize, listeners } = get();
    cleanup();
    initialize();
    listeners.forEach((callback, event) => {
      onEvent(event, callback);
    });
  },

  cleanup: () => {
    cleanupSocket();
    set({
      listeners: new Map<string, (...args: any[]) => void>(),
      socketStatus: SOCKET.DISCONNECTED,
      isInitialized: false,
      signId: null,
      templateId: null,
    });
  },
}));

export default useSocketStore;