"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { ManagerOptions } from "socket.io-client";
import { useAuthStore } from "@/features/core/auth/store";
import { shouldRunAdminConsoleClient } from "@/lib/auth/cookies";
import { getSocketManager, SocketManagerConfig, SocketManager } from "./socketManager";

export const SOCKET_STATUS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
  RECONNECTED: "reconnected",
  ERROR: "error",
} as const;

export type SocketStatus = typeof SOCKET_STATUS[keyof typeof SOCKET_STATUS];

interface SocketContextType {
  status: SocketStatus;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, callback: (...args: any[]) => void) => () => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
  url?: string;
  options?: Partial<ManagerOptions>;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
  options = {},
}) => {
  const [status, setStatus] = useState<SocketStatus>(SOCKET_STATUS.DISCONNECTED);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const { authData } = useAuthStore();
  const pathname = usePathname();
  const adminSocketEnabled = shouldRunAdminConsoleClient(pathname) && Boolean(authData?.id);
  const socketManagerRef = useRef<SocketManager | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;

    const config: SocketManagerConfig = {
      url,
      options,
      maxReconnectAttempts: 10,
      baseReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      healthCheckInterval: 30000,
      enableLogging: true,
    };

    socketManagerRef.current = getSocketManager(config);
    isInitializedRef.current = true;
  }, [url, options]);

  useEffect(() => {
    if (!socketManagerRef.current) return;

    const handleStatusChange = (newStatus: string) => {
      setStatus(newStatus as SocketStatus);
      const stats = socketManagerRef.current!.getStats();
      setReconnectAttempts(stats.reconnectAttempts);
      setLastError(stats.lastError);
    };

    const cleanup = socketManagerRef.current.onStatusChange(handleStatusChange);
    return cleanup;
  }, []);

  const connect = useCallback(async () => {
    if (socketManagerRef.current) {
      await socketManagerRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    socketManagerRef.current?.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    socketManagerRef.current?.reconnect();
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketManagerRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    return socketManagerRef.current?.on(event, callback) ?? (() => {});
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    socketManagerRef.current?.off(event, callback);
  }, []);

  useEffect(() => {
    if (!adminSocketEnabled) {
      socketManagerRef.current?.disconnect();
      return;
    }
    if (authData?.id && socketManagerRef.current && !socketManagerRef.current.isConnected()) {
      void connect();
    }
  }, [adminSocketEnabled, authData?.id, connect]);

  useEffect(() => {
    if (status === SOCKET_STATUS.CONNECTED && adminSocketEnabled && authData?.id) {
      emit("REGISTER_CONSOLE_ADMIN", { userId: authData.id });
    }
  }, [status, adminSocketEnabled, authData?.id, emit]);

  useEffect(() => {
    return () => {
      socketManagerRef.current?.disconnect();
    };
  }, []);

  const contextValue = useMemo<SocketContextType>(
    () => ({
      status,
      isConnected: status === SOCKET_STATUS.CONNECTED,
      isReconnecting: status === SOCKET_STATUS.RECONNECTING,
      reconnectAttempts,
      lastError,
      connect,
      disconnect,
      emit,
      on,
      off,
      reconnect,
    }),
    [status, reconnectAttempts, lastError, connect, disconnect, emit, on, off, reconnect]
  );

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    // Return a default context instead of throwing an error
    // This prevents crashes in error boundaries or other contexts where provider might not be available
    return {
      status: SOCKET_STATUS.DISCONNECTED,
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastError: null,
      connect: () => Promise.resolve(),
      disconnect: () => {},
      emit: () => {},
      on: () => () => {},
      off: () => {},
      reconnect: () => {}
    };
  }
  return context;
};

export const useSocketStatus = () => {
  const { status, isConnected, isReconnecting, reconnectAttempts, lastError } = useSocket();
  return { status, isConnected, isReconnecting, reconnectAttempts, lastError };
};

export const useSocketEvent = (event: string, callback: (...args: any[]) => void, deps: any[] = []) => {
  const { on } = useSocket();

  useEffect(() => {
    const cleanup = on(event, callback);
    return cleanup;
  }, [event, on, ...deps]);
};