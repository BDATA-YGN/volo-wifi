"use client";

import { io, Socket, ManagerOptions } from "socket.io-client";

export interface SocketManagerConfig {
  url: string;
  options?: Partial<ManagerOptions>;
  maxReconnectAttempts?: number;
  baseReconnectDelay?: number;
  maxReconnectDelay?: number;
  healthCheckInterval?: number;
  enableLogging?: boolean;
}

export interface ConnectionStats {
  connectTime: Date | null;
  disconnectTime: Date | null;
  reconnectAttempts: number;
  totalReconnects: number;
  lastError: string | null;
}

export class SocketManager {
  private socket: Socket | null = null;
  private config: Required<SocketManagerConfig>;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private stats: ConnectionStats = {
    connectTime: null,
    disconnectTime: null,
    reconnectAttempts: 0,
    totalReconnects: 0,
    lastError: null,
  };
  private listeners = new Map<string, (...args: any[]) => void>();
  private isManualDisconnect = false;
  private statusCallbacks = new Set<(status: string) => void>();

  constructor(config: SocketManagerConfig) {
    this.config = {
      options: {},
      maxReconnectAttempts: 10,
      baseReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      healthCheckInterval: 30000,
      enableLogging: true,
      ...config,
    };
  }

  private log(message: string, ...args: unknown[]) {
    if (this.config.enableLogging) {
      console.log(`[SocketManager] ${message}`, ...args);
    }
  }

  private getReconnectDelay(): number {
    return Math.min(
      this.config.baseReconnectDelay * Math.pow(2, this.stats.reconnectAttempts),
      this.config.maxReconnectDelay
    );
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthCheckInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping", { timestamp: Date.now() });
      }
    }, this.config.healthCheckInterval);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private notifyStatusChange(status: string): void {
    this.statusCallbacks.forEach((callback) => callback(status));
  }

  private handleReconnect(): void {
    if (this.isManualDisconnect) return;

    if (this.stats.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log("Maximum reconnection attempts reached");
      this.notifyStatusChange("error");
      return;
    }

    this.stats.reconnectAttempts++;
    this.stats.totalReconnects++;
    this.notifyStatusChange("reconnecting");

    const delay = this.getReconnectDelay();
    this.log(`Attempting reconnection in ${delay}ms (attempt ${this.stats.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => this.connect(), delay);
  }

  public async connect(): Promise<void> {
    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.log("Connecting to socket server...");
    this.notifyStatusChange("connecting");

    this.socket = io(this.config.url, {
      transports: ["websocket", "polling"],
      path: process.env.NEXT_PUBLIC_SOCKET_PATH as string || "/socket.io",
      timeout: 20000,
      reconnection: false,
      forceNew: true,
      ...this.config.options,
    });

    this.socket.on("connect", () => {
      this.log("Connected to server");
      this.stats.connectTime = new Date();
      this.stats.reconnectAttempts = 0;
      this.stats.lastError = null;
      this.notifyStatusChange("connected");
      this.startHealthCheck();
    });

    this.socket.on("disconnect", (reason) => {
      this.log("Disconnected from server:", reason);
      this.stats.disconnectTime = new Date();
      this.notifyStatusChange("disconnected");
      this.stopHealthCheck();

      if (!this.isManualDisconnect && reason !== "io client disconnect") {
        this.handleReconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      this.log("Connection error:", error.message);
      this.stats.lastError = error.message;
      this.notifyStatusChange("error");
      this.stopHealthCheck();

      if (!this.isManualDisconnect) {
        this.handleReconnect();
      }
    });

    this.socket.on("reconnect", () => {
      this.log("Reconnected to server");
      this.stats.connectTime = new Date();
      this.stats.reconnectAttempts = 0;
      this.stats.lastError = null;
      this.notifyStatusChange("reconnected");
      this.startHealthCheck();
    });

    this.listeners.forEach((callback, event) => {
      this.socket?.on(event, callback);
    });
  }

  public disconnect(): void {
    this.log("Manually disconnecting...");
    this.isManualDisconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHealthCheck();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.notifyStatusChange("disconnected");
    this.stats.disconnectTime = new Date();
  }

  public emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      this.log("Cannot emit event, socket not connected");
    }
  }

  public on(event: string, callback: (...args: any[]) => void): () => void {
    this.listeners.set(event, callback);
    this.socket?.on(event, callback);
    return () => {
      this.listeners.delete(event);
      this.socket?.off(event, callback);
    };
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.listeners.delete(event);
      this.socket?.off(event, callback);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  public onStatusChange(callback: (status: string) => void): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  public getStats(): ConnectionStats {
    return { ...this.stats };
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public reconnect(): void {
    this.log("Manual reconnection requested");
    this.isManualDisconnect = false;
    this.stats.reconnectAttempts = 0;
    this.connect();
  }

  public destroy(): void {
    this.log("Destroying socket manager");
    this.disconnect();
    this.listeners.clear();
    this.statusCallbacks.clear();
  }
}

let socketManagerInstance: SocketManager | null = null;

export const getSocketManager = (config?: SocketManagerConfig): SocketManager => {
  if (!socketManagerInstance && config) {
    socketManagerInstance = new SocketManager(config);
  }
  if (!socketManagerInstance) {
    throw new Error("SocketManager not initialized. Call getSocketManager with config first.");
  }
  return socketManagerInstance;
};

export const destroySocketManager = (): void => {
  if (socketManagerInstance) {
    socketManagerInstance.destroy();
    socketManagerInstance = null;
  }
};