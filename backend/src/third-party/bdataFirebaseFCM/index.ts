import * as admin from 'firebase-admin';
import { Message, MulticastMessage } from 'firebase-admin/messaging';
import staging from './staging.json';
import production from './production.json';
import development from './development.json'
import { NODE_ENV } from '@/config';
import { logger } from '@/logging/logger';

if (!admin.apps.length) {
  // 2. Decide which OBJECT to use, not which path string
  let serviceAccount = {};
  switch (NODE_ENV) {
    case 'development':
      serviceAccount = development;
      break;
    case 'staging':
      serviceAccount = staging;
      break;
    case 'production':
      serviceAccount = production;
      break;
    default:
      serviceAccount = development;
      break;
  }

  admin.initializeApp({
    // 3. Cast to any if TS complains about the JSON structure not matching ServiceAccount type
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });

  logger.info('Firebase Admin initialized', { env: NODE_ENV });
}

export class FCMService {
  private static messaging = admin.messaging();

  private static sanitizeData(data?: Record<string, any>): Record<string, string> {
    if (!data) return {};
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      sanitized[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return sanitized;
  }

  /**
   * NEW: Sends a notification to a single specific device token
   */
  static async sendToDevice(token: string, title: string, body: string, data?: Record<string, any>, notify = false) {
    const message: Message = {
      token: token,
      data: this.sanitizeData(data),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Common for mobile deep-linking
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
      message.notification = { title, body }
    }

    try {
      const response = await this.messaging.send(message);
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
      message.notification = { title, body }
    }

    try {
      return await this.messaging.send(message);
    } catch (error) {
      logger.error('Error sending FCM to topic', { error });
    }
  }

  /**
   * Sends a notification to multiple device tokens (Multicast)
   */
  static async sendToDevices(tokens: string[], title: string, body: string, data?: Record<string, any>, notify = false) {
    if (tokens.length === 0) return;

    // FCM Multicast allows up to 500 tokens at a time
    const message: MulticastMessage = {
      tokens: tokens,
      data: this.sanitizeData(data),
    };

    if (notify) {
      message.notification = { title, body }
    }

    try {
      const response = await this.messaging.sendEachForMulticast(message);

      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            // resp.error?.code will tell you why (e.g., 'messaging/registration-token-not-registered')
            logger.warn('FCM multicast token failed', { code: resp.error?.code });
          }
        });
      }
      return response;
    } catch (error) {
      logger.error('Error sending FCM multicast', { error });
    }
  }
}