import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { Message, Messaging, MulticastMessage } from 'firebase-admin/messaging';
import { NODE_ENV, env } from '@/config';
import { logger } from '@/logging/logger';

let messaging: Messaging | null = null;

function resolveServiceAccount(): admin.ServiceAccount | null {
  const fromEnv = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv) as admin.ServiceAccount;
    } catch (error) {
      logger.error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON', { error });
      return null;
    }
  }

  const configuredPath = env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  // Never use require('./{env}.json') — those files are gitignored/dockerignored and crash Node with MODULE_NOT_FOUND.
  const candidates = [
    configuredPath,
    path.join(__dirname, `${NODE_ENV}.json`),
    path.join(__dirname, 'production.json'),
    path.join(process.cwd(), 'src/third-party/bdataFirebaseFCM', `${NODE_ENV}.json`),
    path.join(process.cwd(), 'src/third-party/bdataFirebaseFCM', 'production.json'),
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const raw = fs.readFileSync(candidate, 'utf8');
      return JSON.parse(raw) as admin.ServiceAccount;
    } catch (error) {
      logger.warn('Failed reading Firebase service account file', {
        path: candidate,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  return null;
}

function ensureFirebaseInitialized(): boolean {
  if (messaging) return true;
  if (admin.apps.length) {
    messaging = admin.messaging();
    return true;
  }

  const serviceAccount = resolveServiceAccount();
  if (!serviceAccount) {
    logger.warn(
      'Firebase Admin skipped — set FIREBASE_SERVICE_ACCOUNT_JSON (or PATH / local *.json). Push notifications disabled.',
      { env: NODE_ENV },
    );
    return false;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  messaging = admin.messaging();
  logger.info('Firebase Admin initialized', { env: NODE_ENV });
  return true;
}

// Best-effort init at import (socket may call FCM when users are offline).
ensureFirebaseInitialized();

export class FCMService {
  private static sanitizeData(data?: Record<string, any>): Record<string, string> {
    if (!data) return {};
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      sanitized[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return sanitized;
  }

  private static getMessaging(): Messaging | null {
    if (!ensureFirebaseInitialized()) return null;
    return messaging;
  }

  /**
   * Sends a notification to a single specific device token
   */
  static async sendToDevice(token: string, title: string, body: string, data?: Record<string, any>, notify = false) {
    const client = this.getMessaging();
    if (!client) return null;

    const message: Message = {
      token: token,
      data: this.sanitizeData(data),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    if (notify) {
      message.notification = { title, body };
    }

    try {
      const response = await client.send(message);
      logger.debug('FCM sent to device', { messageId: response });
      return response;
    } catch (error: any) {
      if (
        error?.code === 'messaging/registration-token-not-registered' ||
        error?.code === 'messaging/invalid-argument'
      ) {
        logger.warn('FCM token invalid; should remove from database', { code: error.code });
      } else {
        logger.error('FCM sendToDevice failed', { error });
      }
      return null;
    }
  }

  /**
   * Sends a notification to a specific Topic
   */
  static async sendToTopic(topic: string, title: string, body: string, data?: Record<string, any>, notify = true) {
    const client = this.getMessaging();
    if (!client) return null;

    logger.debug('FCM sendToTopic', { topic, notify });

    const sanitizedData = this.sanitizeData(data);

    const message: Message = {
      topic: topic,
      data: {
        ...sanitizedData,
        title: String(title),
        body: String(body),
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'retro',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    if (notify) {
      message.notification = { title, body };
    }

    try {
      return await client.send(message);
    } catch (error) {
      logger.error('Error sending FCM to topic', { error });
      return null;
    }
  }

  /**
   * Sends a notification to multiple device tokens (Multicast)
   */
  static async sendToDevices(tokens: string[], title: string, body: string, data?: Record<string, any>, notify = false) {
    if (tokens.length === 0) return;

    const client = this.getMessaging();
    if (!client) return null;

    const message: MulticastMessage = {
      tokens: tokens,
      data: this.sanitizeData(data),
    };

    if (notify) {
      message.notification = { title, body };
    }

    try {
      const response = await client.sendEachForMulticast(message);

      if (response.failureCount > 0) {
        response.responses.forEach((resp) => {
          if (!resp.success) {
            logger.warn('FCM multicast token failed', { code: resp.error?.code });
          }
        });
      }
      return response;
    } catch (error) {
      logger.error('Error sending FCM multicast', { error });
      return null;
    }
  }
}
