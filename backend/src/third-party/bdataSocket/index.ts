import { SOCKET_PORT, IO_REDIS_URL, SOCKET_REDIS_ENABLED, ALLOWED_ORIGINS } from '@/config';
import { logger } from '@/logging/logger';
import * as http from 'http';
import * as express from 'express';
import { Server, Socket } from 'socket.io';
import { Container, Service } from 'typedi';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis, { type RedisOptions } from 'ioredis';
import type { PrismaClient } from '@/generated/prisma/client';
import { SIO_EVENTS } from './sioConstants';
import { FCMService } from '../bdataFirebaseFCM';

const REDIS_CONNECT_TIMEOUT_MS = 5_000;

function redisClientOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: 3,
    connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 200, 2_000);
    },
  };
}

function attachRedisErrorHandler(client: Redis, label: string): void {
  client.on('error', (err) => {
    const code = (err as NodeJS.ErrnoException).code;
    logger.warn(`Redis client error (${label})`, {
      code,
      message: err.message,
    });
  });
}

function createRedisClient(url: string, label: string): Redis {
  const client = new Redis(url, redisClientOptions());
  attachRedisErrorHandler(client, label);
  return client;
}

export interface EventObject {
  event: typeof SIO_EVENTS[keyof typeof SIO_EVENTS];
  eventId: string; // This is usually the User ID
  type: string;
  status?: 'success' | 'info' | 'warning' | 'error';
  data: any;
  timestamp: Date;
}

@Service()
export class WebSocketService {
  private static instance: WebSocketService;
  private io!: Server;
  private server!: http.Server;
  private redis: Redis | null = null;
  private redisPub: Redis | null = null;
  private redisSub: Redis | null = null;
  /** In-process online set when SOCKET_REDIS_ENABLED=false. */
  private readonly localOnlineUsers = new Set<string>();
  private initialized = false;

  // Global sync state tracking
  private static currentSyncState: any = null;

  constructor(private readonly app: express.Application) { }

  public static getInstance(app?: express.Application): WebSocketService {
    if (!WebSocketService.instance) {
      if (!app) throw new Error('Express application instance required for first initialization');
      WebSocketService.instance = new WebSocketService(app);
    }
    return WebSocketService.instance;
  }

  public async init(): Promise<void> {
    this.server = http.createServer(this.app);

    this.io = new Server(this.server, {
      path: '/general/socket.io',
      transports: ['websocket'],
      cors: { origin: (ALLOWED_ORIGINS || '*').split(',').map(o => o.trim()) },
      pingInterval: 25000,
      pingTimeout: 60000,
    });

    if (SOCKET_REDIS_ENABLED) {
      const redisReady = await this.setupRedisStack();
      if (!redisReady) {
        this.fallbackToLocalRedisMode(
          'Redis is unreachable — continuing in single-instance mode. ' +
            'Set SOCKET_REDIS_ENABLED=false to skip connection attempts, or fix IO_REDIS_URL.',
        );
      }
    } else {
      this.fallbackToLocalRedisMode(
        'SOCKET_REDIS_ENABLED=false — Socket.IO runs without Redis (single-instance mode). ' +
          'Cross-instance events, shared online-user tracking, and post-restart online state are disabled.',
      );
    }

    this.setupConnectionHandlers();

    this.server.listen(SOCKET_PORT, () => {
      logger.info(`🚀 Socket.IO listening on ${SOCKET_PORT}`);
    });
    this.initialized = true;
  }

  private fallbackToLocalRedisMode(message: string): void {
    logger.warn(message);
  }

  private async connectRedisClient(client: Redis, label: string): Promise<boolean> {
    try {
      if (client.status === 'wait') {
        await client.connect();
      }
      await client.ping();
      logger.info(`Redis connected (${label})`);
      return true;
    } catch (err) {
      logger.error(`Redis connection failed (${label})`, {
        err: err instanceof Error ? { message: err.message, name: err.name } : err,
      });
      try {
        client.disconnect();
      } catch {
        // ignore
      }
      return false;
    }
  }

  private async teardownRedisClients(): Promise<void> {
    const clients = [this.redis, this.redisPub, this.redisSub].filter(Boolean) as Redis[];
    this.redis = null;
    this.redisPub = null;
    this.redisSub = null;
    await Promise.all(
      clients.map((client) =>
        client.quit().catch(() => client.disconnect()),
      ),
    );
  }

  /** Returns false when Redis cannot be reached (caller falls back to in-process mode). */
  private async setupRedisStack(): Promise<boolean> {
    const main = createRedisClient(IO_REDIS_URL, 'main');
    const mainOk = await this.connectRedisClient(main, 'main');
    if (!mainOk) {
      await main.quit().catch(() => main.disconnect());
      return false;
    }
    this.redis = main;

    const pub = createRedisClient(IO_REDIS_URL, 'adapter-pub');
    const pubOk = await this.connectRedisClient(pub, 'adapter-pub');
    if (!pubOk) {
      await pub.quit().catch(() => pub.disconnect());
      await this.teardownRedisClients();
      return false;
    }

    const sub = pub.duplicate();
    attachRedisErrorHandler(sub, 'adapter-sub');
    const subOk = await this.connectRedisClient(sub, 'adapter-sub');
    if (!subOk) {
      await sub.quit().catch(() => sub.disconnect());
      await pub.quit().catch(() => pub.disconnect());
      await this.teardownRedisClients();
      return false;
    }

    this.redisPub = pub;
    this.redisSub = sub;
    this.io.adapter(createAdapter(pub, sub));
    return true;
  }

  private readonly ONLINE_USERS_KEY = 'online_users_set';

  /** @returns 1 if user was newly marked online, 0 if already online. */
  private async markUserOnline(userId: string): Promise<number> {
    if (this.redis) {
      try {
        return await this.redis.sadd(this.ONLINE_USERS_KEY, userId);
      } catch (err) {
        logger.warn('Redis sadd failed; using local online set', {
          userId,
          err: err instanceof Error ? err.message : err,
        });
      }
    }
    if (this.localOnlineUsers.has(userId)) return 0;
    this.localOnlineUsers.add(userId);
    return 1;
  }

  private async markUserOffline(userId: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.srem(this.ONLINE_USERS_KEY, userId);
        return;
      } catch (err) {
        logger.warn('Redis srem failed; using local online set', {
          userId,
          err: err instanceof Error ? err.message : err,
        });
      }
    }
    this.localOnlineUsers.delete(userId);
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on(SIO_EVENTS.REGISTER_CONSOLE_ADMIN, (payload) => this.registerAdmin(socket, payload));

      socket.on('disconnect', async (reason) => {
        const userId = socket.data.userId;
        if (userId) {
          const userRoom = `user_room:${userId}`;
          const activeSockets = await this.io.in(userRoom).fetchSockets();

          if (activeSockets.length === 0) {
            await this.markUserOffline(userId);
            await this.setAdminOnline(userId, false);
            logger.info(`User ${userId} fully disconnected and marked offline.`);
          }
        }
        logger.info(`Socket disconnected: ${socket.id}, reason=${reason}`);
      });
    });
  }

  public updateGlobalSyncState(state: any): void {
    WebSocketService.currentSyncState = state;
    this.broadcast('SYNC_PROGRESS', state);
  }

  public getGlobalSyncState(): any {
    return WebSocketService.currentSyncState;
  }

  private async registerAdmin(socket: Socket, payload: any): Promise<void> {
    if (!payload?.userId) {
      socket.disconnect(true);
      return;
    }

    const userId = String(payload.userId);

    if (!payload?.token) {
      logger.warn('Socket REGISTER_CONSOLE_ADMIN without token; userId trust is not verified', {
        userId,
        socketId: socket.id,
      });
    }
    socket.data.userId = userId;

    socket.join(`user_room:${userId}`);
    const becameOnline = await this.markUserOnline(userId);
    if (becameOnline === 1) {
      await this.setAdminOnline(userId, true);
    }

    const shard = this.getShard(userId);
    const room = `${SIO_EVENTS.REGISTER_CONSOLE_ADMIN}:${shard}`;
    socket.join(room);

    logger.info(`User ${userId} registered. Room: ${room}`);

    if (WebSocketService.currentSyncState) {
      socket.emit('SYNC_PROGRESS', WebSocketService.currentSyncState);
    }
  }

  private async setAdminOnline(adminId: string, online: boolean): Promise<void> {
    try {
      if (!Container.has('prismaClient')) return;
      const prisma = Container.get<PrismaClient>('prismaClient');
      const data: { isOnline: boolean; lastLogin?: Date } = { isOnline: online };
      if (online) data.lastLogin = new Date();
      await prisma.admin.update({
        where: { id: adminId },
        data,
      });
    } catch (err: any) {
      logger.warn(`setAdminOnline(${adminId}, ${online}) failed: ${err.message}`);
    }
  }

  public async smartNotify(event: EventObject): Promise<void> {
    const userId = event.eventId;
    const isOnline = await this.isUserOnline(userId);

    if (isOnline) {
      logger.info(`Routing to SOCKET for user: ${userId}`);
      await this.sendSocketEvent(event);
    } else {
      logger.info(`Routing to FCM for user: ${userId}`);
      await this.sendFcmNotification(userId, event);
    }
  }

  public async isUserOnline(userId: string): Promise<boolean> {
    if (this.redis) {
      try {
        const result = await this.redis.sismember(this.ONLINE_USERS_KEY, userId);
        return result === 1;
      } catch (err) {
        logger.warn('Redis sismember failed; using local online set', {
          userId,
          err: err instanceof Error ? err.message : err,
        });
      }
    }
    return this.localOnlineUsers.has(userId);
  }

  private async sendFcmNotification(userId: string, event: EventObject) {
    try {
      logger.info('Routing to FCM', { userId, type: event.type });
      const response = await FCMService.sendToTopic(userId, event.data.title, event.data.body, event.data.payload, true);
      logger.info(`FCM placeholder for ${response}: ${event.type}`);
    } catch (error) {
      logger.error(`Error sending FCM notification for user ${userId}:`, error);
    }
  }

  public async sendSocketEvent(event: EventObject): Promise<void> {
    if (!this.io) {
      logger.warn(`Cannot send socket event: IO not initialized`);
      return;
    }
    const eventIdStr = String(event.eventId);
    const shard = this.getShard(eventIdStr);
    const room = `${event.event}:${shard}`;
    this.io.to(room).emit(event.type, event);
  }

  private getShard(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash |= 0;
    }
    return String(Math.abs(hash) % 1000);
  }

  public async broadcast(event: string, payload: any): Promise<void> {
    if (!this.io) {
      logger.warn(`Cannot broadcast ${event}: IO not initialized`);
      return;
    }
    this.io.emit(event, payload);
  }

  public async emitToUser(userId: string, event: string, payload: any): Promise<void> {
    if (!this.io) {
      logger.warn(`Cannot emit ${event} to ${userId}: IO not initialized`);
      return;
    }
    this.io.to(`user_room:${userId}`).emit(event, payload);
  }

  public async close(): Promise<void> {
    try {
      await this._closeSocket();
      await this._closeServer();

      const clients = [this.redis, this.redisPub, this.redisSub].filter(Boolean) as Redis[];
      await Promise.all(clients.map((c) => c.quit().catch(() => undefined)));
      this.redis = null;
      this.redisPub = null;
      this.redisSub = null;
      this.localOnlineUsers.clear();
    } catch (err) {
      logger.error('Error during WebSocketService cleanup:', err);
    } finally {
      this.initialized = false;
    }
  }

  private async _closeSocket() {
    if (this.io) {
      return new Promise<void>((resolve) => {
        this.io.close(() => resolve());
      });
    }
  }

  private async _closeServer() {
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server.close(() => resolve());
      });
    }
  }
}
