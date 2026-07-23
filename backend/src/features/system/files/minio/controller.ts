import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import { FolderSchema, UploadSchema, FileOperationSchema } from './schema';
import { MINIO_PRIVATE_BUCKET } from '@/config';
import * as MinioService from './service';

const DEFAULT_BUCKET = MINIO_PRIVATE_BUCKET || 'private';

export class Controller {
  public listFolders = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { bucket = DEFAULT_BUCKET, prefix = '' } = req.query;

      const folders = await MinioService.listFolders(String(bucket), String(prefix));

      responseSuccess(res, {
        message: 'Success',
        data: folders,
      });
    }),
  ];

  public createFolder = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { error, value } = FolderSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, { code: '400', message: error.details.map(err => err.message).join(', ') });
      }

      const { folderName, bucket = DEFAULT_BUCKET } = value;

      const result = await MinioService.createFolder(String(bucket), folderName);

      responseSuccess(res, {
        message: 'Folder created successfully',
        data: result,
      });
    }),
  ];

  public deleteFolder = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { error, value } = FileOperationSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, { code: '400', message: error.details.map(err => err.message).join(', ') });
      }

      const { key, bucket = DEFAULT_BUCKET } = value;

      const result = await MinioService.removeFolder(String(bucket), key);

      responseSuccess(res, {
        message: 'Folder deleted successfully',
        data: result,
      });
    }),
  ];

  public listFiles = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { bucket = DEFAULT_BUCKET, prefix = '' } = req.query;

      const result = await MinioService.listFiles(String(bucket), String(prefix));

      responseSuccess(res, {
        message: 'Success',
        data: {
          files: result.objects,
          folders: result.prefixes,
        },
      });
    }),
  ];

  public deleteFile = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { error, value } = FileOperationSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, { code: '400', message: error.details.map(err => err.message).join(', ') });
      }

      const { key, bucket = DEFAULT_BUCKET } = value;

      const result = await MinioService.removeFile(String(bucket), key);

      responseSuccess(res, {
        message: 'File deleted successfully',
        data: result,
      });
    }),
  ];

  public getFileUrl = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { key, bucket = DEFAULT_BUCKET } = req.query;

      if (!key) {
        return responseError(res, 400, { code: '400', message: 'File key is required' });
      }

      const url = await MinioService.getFileUrl(String(bucket), String(key));

      responseSuccess(res, {
        message: 'Success',
        data: { url },
      });
    }),
  ];
}
