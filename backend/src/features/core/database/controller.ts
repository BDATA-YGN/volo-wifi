import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import Container from 'typedi';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { Databases, Admin } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import { DB_BACKUP } from '@/config';
import { logger } from '@/logging/logger';
import { FileUpload } from '@/middlewares/file-upload.middleware';
import { InvalidPayloadException } from '@/utils/exception';

const execPromise = util.promisify(exec);

// Interface for backup/restore log
interface OperationLog {
  type: 'BACKUP' | 'RESTORE';
  filePath: string;
  status: 'SUCCESS' | 'FAILED';
  message?: string;
}

export class Controller {
  private databaseService = Container.get<BaseService<Databases, any>>('databaseService');

  // SQL backup upload middleware
  private backupUpload = FileUpload({
    folder: DB_BACKUP,
    allowFileType: 'sql',
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  // Create backup
  public createBackup = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user as Admin;
      const nameParam = req.params.name as unknown as string | string[] | undefined;
      const name = Array.isArray(nameParam) ? nameParam[0] : nameParam;
      const databaseName = name || 'default_db';
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `${databaseName.trim().toLowerCase()}-${timestamp}.sql`;
        const backupPath = path.join(DB_BACKUP, backupFileName);
        console.log(`Creating backup for database: ${databaseName} at ${backupPath}`);
        await execPromise(`pg_dump -U postgres -F p ${process.env.DB_DATABASE} > ${backupPath}`, {
          env: {
            ...process.env,
            PGPASSWORD: process.env.DB_PASSWORD,
          },
        });


        // Log backup operation
        const log = await this.databaseService.baseModel().create({
          data: {
            type: 'BACKUP',
            dbName: databaseName,
            filePath: backupPath,
          },
        });

        responseSuccess(res, { message: 'Backup created successfully', data: { filePath: backupPath, log } });
      } catch (error) {
        logger.error(`Backup failed: ${error.message}`);
        responseError(res, 500, { code: "500",message: 'Backup failed' });
      }
    }),
  ];

  // Restore database
  public restoreDatabase = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user as Admin;
      const logIdParam = req.params.logId as unknown as string | string[];
      const logId = Array.isArray(logIdParam) ? logIdParam[0] : logIdParam;
      try {
        const log = await this.databaseService.baseModel().findUnique({
          where: { id: parseInt(logId) },
        });

        if (!log || log.type !== 'BACKUP' || log.status !== 'SUCCESS') {
          responseError(res, 400, { code: "404", message: 'Invalid backup log' });
          return;
        }

        // Execute restore command (example for PostgreSQL)
        await execPromise(`psql -U postgres -f ${log.filePath}`);

        // Log restore operation
        const restoreLog = await this.databaseService.baseModel().create({
          data: {
            type: 'RESTORE',
            filePath: log.filePath,
            status: 'SUCCESS',
          },
        });

        responseSuccess(res, { message: 'Database restored successfully', data: restoreLog });
      } catch (error) {
        // Log failed restore
        await this.databaseService.baseModel().create({
          data: {
            type: 'RESTORE',
            filePath: '',
            status: 'FAILED',
            message: error.message,
          },
        });
        responseError(res, 500, { code: "500", message: 'Restore failed' });
      }
    }),
  ];

  // Get all backup/restore logs
  public getAllDatabasesLogs = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user as Admin;
      try {
        const databaseLogs = await this.databaseService.baseModel().findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });
        responseSuccess(res, { message: 'Success', data: databaseLogs });
      } catch (error) {
        responseError(res, 500, { code: "500", message: 'Failed to fetch logs' });
      }
    }),
  ];

  // Download backup file
  public downloadBackup = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user as Admin;
      const logIdParam = req.params.logId as unknown as string | string[];
      const logId = Array.isArray(logIdParam) ? logIdParam[0] : logIdParam;
      try {
        const log = await this.databaseService.baseModel().findUnique({
          where: { id: parseInt(logId) },
        });

        if (!log || log.type !== 'BACKUP' || log.status !== 'SUCCESS') {
          responseError(res, 400, {code: "400", message: 'Invalid backup log' });
          return;
        }

        const filePath = log.filePath;
        if (!fs.existsSync(filePath)) {
          responseError(res, 404, { code: "404", message: 'Backup file not found' });
          return;
        }

        res.download(filePath, path.basename(filePath), err => {
          if (err) {
            responseError(res, 500, { code: "500", message: 'Failed to download file' });
          }
        });
      } catch (error) {
        responseError(res, 500, { code: "500", message: 'Failed to process download' });
      }
    }),
  ];

  public uploadBackup = [
    this.backupUpload.single('backupFile'),
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user as Admin;

      try {
        if (!req.file) {
          throw new InvalidPayloadException('No file uploaded');
        }

        const filePath = req.file.path;
        const fileName = req.file.filename;

        // Validate SQL file content
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (!fileContent.includes('CREATE') && !fileContent.includes('INSERT')) {
          fs.unlinkSync(filePath);
          throw new InvalidPayloadException('Invalid SQL backup file');
        }

        const log = await this.databaseService.baseModel().create({
          data: {
            type: 'MANUAL_UPLOAD',
            dbName: 'manual-upload',
            filePath: filePath,
            status: 'SUCCESS',
            createdBy: user.id,
          },
        });

        responseSuccess(res, {
          message: 'Backup file uploaded successfully',
          data: { filePath, fileName, log },
        });
      } catch (error) {
        if (req.file?.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            logger.error(`Failed to clean up file: ${cleanupError.message}`);
          }
        }

        logger.error(`Upload failed: ${error.message}`);
        await this.databaseService.baseModel().create({
          data: {
            type: 'MANUAL_UPLOAD',
            filePath: req.file?.path || '',
            status: 'FAILED',
            message: error.message,
            createdBy: user.id,
          },
        });
        responseError(res, error instanceof InvalidPayloadException ? 400 : 500, {
          code: error instanceof InvalidPayloadException ? "400" : "500",
          message: error.message,
        });
      }
    }),
  ];
}
