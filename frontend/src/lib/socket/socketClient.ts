"use client";
import _ from "lodash";
import { io, Socket } from "socket.io-client";

// Define possible socket connection statuses
export const SOCKET_STATUS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
  RECONNECTED: "reconnected",
} as const;


// Define the socket options interface
interface SocketOptions {
  autoConnect?: boolean;
  forceNew?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  reconnectionAttempts?: number;
  timeout?: number;
  transports?: string[];
  [key: string]: any; // Allow additional options
}

// Define socket type
let socket: Socket | null = null;
let statusCallback: ((status: string) => void) | undefined;

// Initialize Socket connection
export const initializeSocket = (
  url: string,
  options: SocketOptions = {},
  onStatusChange: (status: string) => void
) => {
  if (!socket) {
    socket = io(url, {
      ...options,
      transports: ["websocket"],
      path: process.env.NEXT_PUBLIC_SOCKET_PATH as string || "/socket.io",
      autoConnect: true,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 3,
      timeout: 10000,
    });
  }

  // Listen to connection events and cast status explicitly
  socket.on("connect", () => onStatusChange(SOCKET_STATUS.CONNECTED));
  socket.on("disconnect", () => onStatusChange(SOCKET_STATUS.DISCONNECTED));
  socket.on("reconnect", () => onStatusChange(SOCKET_STATUS.RECONNECTED));
  socket.on("reconnecting", () => onStatusChange(SOCKET_STATUS.RECONNECTING));

  // Store status callback function
  statusCallback = onStatusChange;
};

// Emit event with type safety
export const emitEvent = <T = any>(event: string, data: T): void => {
  if (socket) {
    socket.emit(event, data);
  }
};

// Listen to events with type safety
export const onEvent = <T = any>(event: string, callback: (data: T) => void): void => {
  if (socket) {
    socket.on(event, callback);
  }
};

// Cleanup socket connection
export const cleanupSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

// Get current socket status
export const getSocketStatus = (): string => {
  if(socket) {
    return socket.connected ? SOCKET_STATUS.CONNECTED : SOCKET_STATUS.DISCONNECTED;
  }
  return SOCKET_STATUS.DISCONNECTED;
};

// Export socket status constants
export const SOCKET = SOCKET_STATUS;
