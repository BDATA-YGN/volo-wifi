import 'reflect-metadata';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import fs from 'fs';
import { NODE_ENV, PORT, LOG_FORMAT, APPLICATION_CONFIG, ALLOWED_ORIGINS } from '@config';
import { Route } from '@interfaces/express.interface';
import { ErrorMiddleware } from '@middlewares/error.middleware';
import { NotFoundMiddleware } from '@middlewares/not-found.middleware';
import { logger, stream } from '@/logging/logger';
import path from 'path';
import { timingMiddleware } from '@middlewares/timing.middleware';
import { responseError } from '@/utils/api-response';
import { Server } from 'http';
import { version } from '../package.json';
import { getReadinessReport } from '@/lib/health/readiness';

/** Default JSON/urlencoded cap; large uploads use multer on specific routes. */
const DEFAULT_BODY_LIMIT = '2mb';

export class App {
  public app: Express;
  public env: string;
  public server: Server;

  constructor(
    prefix: string,
    routes: Route[],
    /**
     * Extra mount groups on the same Express instance (e.g. console also serves
     * captive `/api` so CAPTIVE_API_URL derived from API_URL host keeps working
     * when only PORT is exposed).
     */
    extraMounts: Array<{ prefix: string; routes: Route[] }> = [],
  ) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.server = new Server(this.app);
    this.configureServerTimeouts();

    this.initializeMiddlewares();
    if (prefix === '/console') {
      this.initializeConsoleDocs();
    }
    this.initializeView();
    this.initializeLocals();
    this.initializeRoutes(prefix, routes);
    for (const mount of extraMounts) {
      this.mountRouteGroup(mount.prefix, mount.routes);
    }
    this.initializeErrorHandling();
  }

  private configureServerTimeouts(): void {
    // Mitigate slowloris / hung sockets (values in ms).
    this.server.requestTimeout = 120_000;
    this.server.headersTimeout = 125_000;
    this.server.keepAliveTimeout = 65_000;
  }

  public listen(port: number, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server
        .listen(port, () => {
          logger.info(`VERSION: ${version}`);
          logger.info(`======= ENV: ${this.env} =======`);
          logger.info(`🚀 ${name} listening on the port ${port}`);
          resolve();
        })
        .once('error', (error: unknown) => {
          logger.error(`Listen error (${name}):`, error);
          reject(error);
        });
    });
  }

  public getServer(): Server {
    return this.server;
  }

  public getExpressApp(): Application {
    return this.app;
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server.listening) {
        logger.info(`${this.env} server is not running, nothing to close`);
        return resolve();
      }

      const forceCloseTimer = setTimeout(() => {
        logger.warn('HTTP server close timed out; destroying open connections');
        this.server.closeAllConnections?.();
        resolve();
      }, 10_000);

      this.server.close((err) => {
        clearTimeout(forceCloseTimer);
        if (err) {
          logger.error(`Error closing ${this.env} server:`, err);
          return reject(err);
        }
        logger.info(`${this.env} server closed successfully`);
        resolve();
      });
    });
  }

  private initializeMiddlewares() {
    this.app.disable('x-powered-by');

    this.app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      }) as unknown as express.RequestHandler,
    );

    const allowed = (ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    const allowAll = allowed.includes('*');

    if (allowAll && (this.env === 'production' || this.env === 'staging')) {
      logger.warn('CORS allows all origins (*); not recommended for production');
    }

    this.app.use(
      cors({
        origin: allowAll
          ? true
          : (origin, cb) => {
              if (!origin) return cb(null, true);
              if (allowed.includes(origin)) return cb(null, true);
              return cb(null, false);
            },
        credentials: !allowAll,
      }) as unknown as express.RequestHandler,
    );

    const trustProxyRaw = process.env.TRUST_PROXY;
    if (trustProxyRaw) {
      const v = trustProxyRaw.trim().toLowerCase();
      if (v === 'true') this.app.set('trust proxy', true);
      else if (v === 'false') this.app.set('trust proxy', false);
      else if (!Number.isNaN(Number(v))) this.app.set('trust proxy', Number(v));
      else this.app.set('trust proxy', v);
    } else {
      this.app.set('trust proxy', 'loopback, linklocal, uniquelocal');
    }

    if (this.env !== 'production') {
      this.app.use(morgan(LOG_FORMAT, { stream }) as unknown as express.RequestHandler);
    } else {
      this.app.use(morgan('combined', { stream }) as unknown as express.RequestHandler);
    }

    this.app.use(hpp() as unknown as express.RequestHandler);
    this.app.use(compression() as unknown as express.RequestHandler);
    this.app.use(express.json({ limit: DEFAULT_BODY_LIMIT, strict: true }));
    this.app.use(express.urlencoded({ extended: true, limit: DEFAULT_BODY_LIMIT }));
    this.app.use(cookieParser());
    this.app.use(timingMiddleware);

    this.app.use(this.jsonParseErrorHandler);
  }

  private jsonParseErrorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    const syntaxErr = err as SyntaxError & { status?: number; body?: unknown };
    if (syntaxErr instanceof SyntaxError && syntaxErr.status === 400 && 'body' in syntaxErr) {
      responseError(res, 400, { code: 'INVALID_JSON', message: 'Invalid JSON body' });
      return;
    }
    next(err as Error);
  };

  private initializeView() {
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  private initializeRoutes(prefix: string, routes: Route[]) {
    this.app.get('/health', async (_req, res) => {
      if (prefix === '/console') {
        try {
          const report = await getReadinessReport(version);
          res.status(report.ready ? 200 : 503).json(report);
        } catch (err) {
          logger.error('Health check failed', err);
          res.status(503).json({
            status: 'degraded',
            ready: false,
            version,
            initial: [
              {
                key: 'server',
                label: 'Server health',
                ready: false,
                detail: err instanceof Error ? err.message : 'Health check failed',
              },
            ],
          });
        }
        return;
      }

      res.status(200).json({ status: 'ok', ready: true, version });
    });

    routes.forEach((route) => {
      this.app.use(prefix, route.router);
    });
  }

  /** Mount a second API prefix without re-registering /health. */
  private mountRouteGroup(prefix: string, routes: Route[]) {
    routes.forEach((route) => {
      this.app.use(prefix, route.router);
    });
    logger.info(`Extra routes mounted at ${prefix} (${routes.length} routers)`);
  }

  private initializeConsoleDocs() {
    const apiDocsPath = path.resolve(__dirname, './docs/console');
    if (!fs.existsSync(apiDocsPath)) {
      logger.info('Console API docs not found. Run "yarn docs" to generate them.');
      return;
    }
    this.app.use('/docs/console', express.static(apiDocsPath));
    logger.info(`DOCS ~ console ~ http://localhost:${PORT}/docs/console`);
  }

  private initializeLocals() {
    this.app.locals = { ...this.app.locals, ...APPLICATION_CONFIG };
  }

  private initializeErrorHandling() {
    this.app.use(NotFoundMiddleware);
    this.app.use(ErrorMiddleware);
  }
}
