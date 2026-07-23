import 'reflect-metadata';
import { App } from '@/app';
import { ValidateEnv } from '@utils/validateEnv';
import { API_PORT, PORT, SOCKET_PORT, validateConfig } from '@/config';
import { logger } from '@/logging/logger';
import { Container } from 'typedi';
import { ServiceInitializer } from '@/models/ServicesRegistry';
import { AppServiceInitializer } from '@/models/AppRegistry';
import PrismaDBConnection from '@/prisma/prisma-client';
import express from 'express';
import { WebSocketService } from './third-party/bdataSocket';

import { AuthRoute } from '@/features/core/auth/routes';
import { MenuPermissionRoute } from './features/core/permissions/routes';
import { AdminRoute } from './features/system/admin-users/routes';
import { TranslationRoute } from './features/core/translations/routes';
import { MenuRoute } from './features/core/menuManagement/routes';
import { DatabaseRoute } from './features/core/database/routes';
import { AuditRoute } from './features/system/audit-logs/routes';
import { UploadRoute } from './features/system/files/upload/route';
import { MinioRoute } from './features/system/files/minio/routes';
import { ThemeRoute } from './features/core/themeBuilder/routes';
import { FileLogRoute } from './features/system/files/filelog/routes';
import { StorageProxyRoute } from './features/system/files/proxy.route';
import { testStorageConnection } from './features/system/files/minio/service';
import { ReceiptsRoute } from './features/core/receiptEditor/routes';
import { PrinterRoute } from './features/core/printers/routes';
import { AppSettingRoute } from './features/system/app-setting/routes';
import { PlacesRoute } from './features/system/places/routes';
import { ConversationRoute } from './features/system/conversations/routes';
import { createWifiRoutes } from './features/wifi/routes.index';
import { startAllJobs } from './jobs';
import { createMobileV1Routes } from './features/mobile/v1/routes.index';
import { createCaptiveRoutes } from './features/captive/routes.index';

ValidateEnv();
validateConfig();

let webSocketService: WebSocketService | null = null;
let consoleApp: App | null = null;
let apiApp: App | null = null;
let isShuttingDown = false;

const enableConsole = PORT != null;
const enableApi = API_PORT != null;
const enableSocket = SOCKET_PORT != null;

const cleanup = async (exitCode: number): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  const tasks: Promise<void>[] = [];

  if (webSocketService) {
    tasks.push(
      webSocketService.close().catch((err) => {
        logger.error('WebSocket shutdown error', err);
      }),
    );
  }
  if (consoleApp) {
    tasks.push(
      consoleApp.close().catch((err) => {
        logger.error('Console app shutdown error', err);
      }),
    );
  }
  if (apiApp) {
    tasks.push(
      apiApp.close().catch((err) => {
        logger.error('API app shutdown error', err);
      }),
    );
  }

  await Promise.all(tasks);
  webSocketService = null;
  consoleApp = null;
  apiApp = null;

  try {
    await PrismaDBConnection.disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Failed to disconnect Prisma:', error);
  }

  logger.info('Cleanup complete. Exiting...');
  process.exit(exitCode);
};

const logFatal = (label: string, error: unknown) => {
  if (error instanceof Error) {
    logger.error(`${label}: ${error.message}`, { stack: error.stack });
    // Ensure Dokploy always sees fatal lines even if winston transport misbehaves.
    // eslint-disable-next-line no-console
    console.error(`[fatal] ${label}: ${error.message}`);
    if (error.stack) {
      // eslint-disable-next-line no-console
      console.error(error.stack);
    }
  } else {
    logger.error(label, { reason: error });
    // eslint-disable-next-line no-console
    console.error(`[fatal] ${label}:`, error);
  }
};

process.on('uncaughtException', (error) => {
  logFatal('Uncaught Exception', error);
  void cleanup(1);
});

process.on('unhandledRejection', (reason) => {
  logFatal('Unhandled Rejection', reason);
  void cleanup(1);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT (Ctrl+C)');
  void cleanup(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM');
  void cleanup(0);
});

const initializeDatabaseAndServices = async (): Promise<void> => {
  await PrismaDBConnection.getConnection();
  const serviceInitializer = Container.get(ServiceInitializer);
  const appServiceInitializer = Container.get(AppServiceInitializer);
  await serviceInitializer.initialize();
  await appServiceInitializer.initialize();

  logger.info('Initializing storage…');
  await testStorageConnection();
};

const initializeCronJobs = async (): Promise<void> => {
  try {
    await startAllJobs();
    logger.info('Started all cron jobs');
  } catch (error) {
    logger.error('Error starting cron jobs', error);
  }
};

const startConsoleApp = async (): Promise<void> => {
  if (!enableConsole) return;
  consoleApp = new App('/console', [
    new AuthRoute(),
    new AdminRoute(),
    new MenuPermissionRoute(),
    new MenuRoute(),
    new TranslationRoute(),
    new DatabaseRoute(),
    new AuditRoute(),
    new UploadRoute(),
    new MinioRoute(),
    new ThemeRoute(),
    new FileLogRoute(),
    new ReceiptsRoute(),
    new PrinterRoute(),
    new AppSettingRoute(),
    new PlacesRoute(),
    new ConversationRoute(),
    ...createWifiRoutes(),
    ...createMobileV1Routes(),
    new StorageProxyRoute(),
  ]);
  await consoleApp.listen(Number(PORT), 'CONSOLE');
};

const startApiApp = async (): Promise<void> => {
  if (!enableApi) return;
  apiApp = new App('/api', [...createMobileV1Routes(), ...createCaptiveRoutes(), new StorageProxyRoute()]);
  await apiApp.listen(Number(API_PORT), 'API');
};

const startSocketApp = async (): Promise<void> => {
  if (!enableSocket) return;
  const socketApp = express();
  webSocketService = WebSocketService.getInstance(socketApp);
  await webSocketService.init();
  Container.set(WebSocketService, webSocketService);
};

const bootstrap = async (): Promise<void> => {
  const startedAt = Date.now();
  logger.info('========== Bootstrap starting ==========');
  logger.info(
    `Starting app with NODE_ENV=${process.env.NODE_ENV}, PORT=${PORT}, API_PORT=${API_PORT}, SOCKET_PORT=${SOCKET_PORT}`,
  );

  logger.info('[1/5] Initializing database and services…');
  await initializeDatabaseAndServices();
  logger.info('[1/5] Database and services initialized');

  logger.info('[2/5] Starting Socket.IO…');
  await startSocketApp();
  if (enableSocket) logger.info('[2/5] Socket app started');
  else logger.info('[2/5] Socket app skipped (SOCKET_PORT unset)');

  logger.info('[3/5] Starting Console API…');
  await startConsoleApp();
  if (enableConsole) logger.info('[3/5] Console app started');
  else logger.info('[3/5] Console app skipped (PORT unset)');

  logger.info('[4/5] Starting Captive API…');
  await startApiApp();
  if (enableApi) logger.info('[4/5] API app started');
  else logger.info('[4/5] API app skipped (API_PORT unset)');

  logger.info('[5/5] Starting cron jobs…');
  await initializeCronJobs();

  const ms = Date.now() - startedAt;
  logger.info('========== System Ready ==========');
  logger.info(
    `Listeners ready in ${ms}ms — console=${enableConsole ? PORT : 'off'}, api=${enableApi ? API_PORT : 'off'}, socket=${enableSocket ? SOCKET_PORT : 'off'}`,
  );
};

void bootstrap().catch(async (error) => {
  logFatal('Error starting applications', error);
  await cleanup(1);
});
