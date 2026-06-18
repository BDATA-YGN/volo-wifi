import { Router, Request, Response } from 'express';
import { Readable } from 'stream';
import mime from 'mime-types';

import { minioClient } from '@/features/system/files/minio/service';
import { Route } from '@/interfaces/express.interface';
import { logger } from '@/logging/logger';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 200;

/**
 * Errors that we retry against MinIO. The remote bucket is occasionally
 * answering with `Valid and authorized credentials required` for valid
 * requests under load — usually a transient socket reuse / signature race in
 * the MinIO JS client. Network blips and idle socket resets follow the same
 * pattern, so we treat them all as retryable.
 */
const TRANSIENT_ERROR_REGEX =
  /credentials|signature|temporarily|timed?[ -]?out|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket hang up/i;

const NOT_FOUND_CODES = new Set(['NotFound', 'NoSuchKey']);

const buildCommonHeaders = (key: string): Record<string, string> => ({
  'Content-Type': mime.lookup(key) || 'application/octet-stream',
  'Accept-Ranges': 'bytes',
  // Browsers and the Next.js image component cache happily on the same URL.
  // 1h is short enough that a re-upload/rename takes effect quickly.
  'Cache-Control': 'public, max-age=3600',
  // Helmet defaults to `same-origin` for CORP, which silently blocks
  // <img>/<video>/<iframe> embeds from the Next.js origin (e.g. :3088 → :6558).
  // Storage assets are meant to be embeddable cross-origin, so opt them in.
  'Cross-Origin-Resource-Policy': 'cross-origin',
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class StorageProxyRoute implements Route {
  public path = '/';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get('/:bucket/*', async (req: Request, res: Response) => {
      const bucketParam = req.params.bucket;
      const keyParam = (req.params as any)[0] as string | string[] | undefined;
      const bucket = Array.isArray(bucketParam) ? bucketParam[0] : bucketParam;
      const key = Array.isArray(keyParam) ? keyParam[0] : keyParam;

      if (!bucket || !key) {
        return res.status(400).send('Invalid request');
      }

      const rangeHeader = req.headers.range;

      const pipeStream = (stream: Readable) =>
        new Promise<void>((resolve, reject) => {
          stream.on('error', reject);
          res.on('close', () => stream.destroy());
          stream.pipe(res).on('finish', () => resolve()).on('error', reject);
        });

      const serveOnce = async (): Promise<void> => {
        if (rangeHeader) {
          // Range requests need the total size to compute Content-Range.
          const stat = await minioClient.statObject(bucket, key);
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

          if (Number.isNaN(start) || start >= stat.size) {
            res.status(416).send('Requested range not satisfiable');
            return;
          }

          const chunkSize = end - start + 1;
          res.writeHead(206, {
            ...buildCommonHeaders(key),
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Content-Length': chunkSize,
          });

          const stream = await minioClient.getPartialObject(bucket, key, start, chunkSize);
          await pipeStream(stream);
          return;
        }

        // Non-range requests: skip statObject to halve MinIO calls (and
        // therefore halve the auth-race window). The browser falls back to
        // chunked transfer encoding when Content-Length is absent — which is
        // exactly what `getObject` streaming wants.
        const stream = await minioClient.getObject(bucket, key);
        res.writeHead(200, buildCommonHeaders(key));
        await pipeStream(stream);
      };

      let lastError: any;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          await serveOnce();
          return;
        } catch (error: any) {
          lastError = error;

          if (res.headersSent) {
            // Partial response already sent; the client will see an aborted
            // stream — nothing we can do but end the response cleanly.
            logger.error(
              `Storage proxy mid-stream error (${bucket}/${key}): ${error.message}`,
            );
            res.end();
            return;
          }

          const code = error.code || error.name || '';
          if (NOT_FOUND_CODES.has(code)) {
            res.status(404).send('File not found');
            return;
          }

          const isTransient = TRANSIENT_ERROR_REGEX.test(error.message || '');
          if (attempt < MAX_RETRIES && isTransient) {
            logger.warn(
              `Storage proxy retry ${attempt}/${MAX_RETRIES - 1} for ${bucket}/${key}: ${error.message}`,
            );
            await sleep(RETRY_BASE_DELAY_MS * attempt);
            continue;
          }

          break;
        }
      }

      logger.error(
        `Storage Proxy Error: ${lastError?.message} (${bucket}/${key})`,
      );
      if (!res.headersSent) {
        res.status(500).send('Internal Storage Error');
      }
    });
  }
}
