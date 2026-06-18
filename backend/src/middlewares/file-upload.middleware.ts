import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import sanitizePath from 'sanitize-filename';
import { Request } from 'express';
import { InvalidPayloadException } from '@/utils/exception';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { storagePublicUrlPrefix, MINIO_PUBLIC_BUCKET, MINIO_PRIVATE_BUCKET } from '@/config';
import { logger } from '@/logging/logger';
import { uploadSingleFile } from '@/features/system/files/minio/service';

const MIMETypes = Object.freeze({
  image: ['image/png', 'image/jpeg', 'image/jpg'],
  sql: ['application/sql', 'text/plain'],
  apk: ['application/vnd.android.package-archive'],
  assets: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/msword',
    'application/pdf',
    'application/zip',
    'image/webp',
    'video/webm',
    'video/mp4',
    'audio/mpeg',
    'audio/flac',
    'audio/ogg',
    'text/plain',
    'application/json',
  ],
});

interface UploadConfig {
  bucket?: string;
  folder?: string;
  allowFileType?: 'image' | 'sql' | 'apk' | 'assets';
  maxSize?: number;
}

const ensureDirectoryExists = (folder: string) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
};

const fileStorage = (folder: string) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDirectoryExists(folder);
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const sanitized = sanitizePath(file.originalname);
      const ext = path.extname(sanitized).toLowerCase();
      cb(null, `file-${uniqueSuffix}${ext}`);
    },
  });

const fileFilter = (allowFileType: UploadConfig['allowFileType']) => (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const available = MIMETypes[allowFileType];
  const ext = path.extname(file.originalname).toLowerCase();
  const valid = {
    image: ['.png', '.jpg', '.jpeg'],
    sql: ['.sql'],
    apk: ['.apk'],
    assets: ['.png', '.jpg', '.jpeg', '.docx', '.pdf', '.zip', '.webp', '.webm', '.mp4', '.mp3', '.txt', '.json'],
  }[allowFileType];

  if (available.includes(file.mimetype) && valid.includes(ext)) cb(null, true);
  else cb(new InvalidPayloadException(`Invalid file type. Allowed: ${valid.join(', ')}`));
};

// ----------------------------------------------------------------------
//  UPDATED: convert to WebP INSIDE FileUpload
// ----------------------------------------------------------------------
export const FileUpload = ({ folder, allowFileType, maxSize = 900 * 1024 * 1024 }: UploadConfig) => {
  ensureDirectoryExists(folder);

  const upload = multer({
    storage: fileStorage(folder),
    fileFilter: fileFilter(allowFileType),
    limits: { fileSize: maxSize },
  });

  const instance = upload;

  // Patch .single() so it converts image automatically
  const originalSingle = instance.single.bind(instance);

  instance.single = (fieldName: string) => {
    const middleware = originalSingle(fieldName);

    return async (req, res, next) => {
      middleware(req, res, async err => {
        if (err) return next(err);

        if (allowFileType === 'image' && req.file) {
          try {
            const oldPath = req.file.path;
            const newFilename = req.file.filename.replace(/\.[^.]+$/, '.webp');
            const newPath = path.join(folder, newFilename);

            await sharp(oldPath).webp({ quality: 85 }).toFile(newPath);

            fs.unlinkSync(oldPath); // delete original

            req.file.filename = newFilename;
            req.file.path = newPath;
            req.file.mimetype = 'image/webp';
          } catch (error) {
            return next(error);
          }
        }

        next();
      });
    };
  };

  return instance;
};

export const FileUploadToS2 = ({ bucket, folder, allowFileType, maxSize = 900 * 1024 * 1024 }: UploadConfig) => {
  // Use memoryStorage because we need the buffer to transform it via Sharp
  const storage = multer.memoryStorage();

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter(allowFileType),
    limits: { fileSize: maxSize },
  });

  const instance = upload;
  const originalSingle = instance.single.bind(instance);

  // Patch .single() to handle R2 upload and WebP conversion
  instance.single = (fieldName: string) => {
    const middleware = originalSingle(fieldName);

    return async (req: AuthenticatedRequest, res: any, next) => {
      middleware(req, res, async (err) => {
        if (err) return next(err);
        if (!req.file) return next();

        try {
          let fileBuffer = req.file.buffer;
          let filename = `${Date.now()}-${req.file.originalname}`;
          let mimetype = req.file.mimetype;

          // 2. Image Processing Logic
          if (allowFileType === 'image') {
            filename = filename.replace(/\.[^.]+$/, '.webp');
            mimetype = 'image/webp';

            fileBuffer = await sharp(req.file.buffer)
              .webp({ quality: 85 })
              .toBuffer();
          }

          // 3. Upload to Cloudflare R2
          const key = folder ? `${folder}/${filename}` : filename;

          // uploadSingleFile previously lived under the mobile storage module.
          // Mobile feature is removed, so this middleware no longer supports S2 upload.
          throw new InvalidPayloadException('S2 upload is disabled');

          // 4. Update req.file so the controller knows the new location
          req.file.filename = filename;
          req.file.key = key; // S3 uses 'key' instead of 'path'
          req.file.mimetype = mimetype;
          // If you have a public custom domain or R2.dev URL:
          req.file.location = `${storagePublicUrlPrefix(bucket)}${key}`;

          next();
        } catch (error) {
          return next(error);
        }
      });
    };
  };

  return instance;
};

export const ConsoleFileUploadToS2 = ({ maxSize = 900 * 1024 * 1024 }: UploadConfig) => {
  const storage = multer.memoryStorage();

  const upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
  });

  const instance = upload;
  const originalSingle = instance.single.bind(instance);

  // Patch .single() to handle R2 upload and WebP conversion
  instance.single = (fieldName: string) => {
    const middleware = originalSingle(fieldName);

    return async (req: AuthenticatedRequest, res: any, next) => {
      const fileFilter = createFileFilter();

      // Apply file filter manually
      middleware(req, res, async (err: any) => {
        const isPublic = req.body.isPublic ?? req.query.isPublic;
        const category = req.body.category ?? req.query.category;
        const type = req.body.type ?? req.query.type;

        if (!isPublic || !category || !type) {
          logger.warn('Upload missing required fields', { isPublic, category, type });
          return next(new InvalidPayloadException('Invalid Payload'));
        }

        logger.debug('Upload request', {
          category,
          folder: req.body.folder ?? req.query.folder,
          isPublic,
          filename: req.file?.originalname,
          type,
        });

        if (err) return next(err);
        if (!req.file) return next();

        // Apply file filter after multer processing
        fileFilter(req, req.file, (filterErr: any) => {
          if (filterErr) return next(filterErr);
        });

        try {
          let fileBuffer = req.file.buffer;
          const originalExt = path.extname(req.file.originalname).toLowerCase();
          const isReplace = req.body.replace === "true" || req.query.replace === "true";
          const sanitizedOriginalName = req.file.originalname.trim().replace(/\s+/g, '_');
          let filename = isReplace ? sanitizedOriginalName : `${Date.now()}_${sanitizedOriginalName}`;
          let mimetype = req.file.mimetype;

          // 2. Image Processing Logic
          if (type == 'image') {
            filename = filename.replace(/\.[^.]+$/, '.webp');
            mimetype = 'image/webp';

            fileBuffer = await sharp(req.file.buffer)
              .webp({ quality: 85 })
              .toBuffer();
          }

          const bucket = isPublic != "true" ? MINIO_PRIVATE_BUCKET : MINIO_PUBLIC_BUCKET;
          const folder = req.body.folder ?? req.query.folder;

          // 3. Upload to Cloudflare R2 / Minio
          let key = category ? `${category}/${folder ? folder + '/' : ''}${filename}` : filename;

          if (type === 'audio' || type === 'video') {
            const folderName = filename.replace(/\.(mp3|wav|mp4|m4a|mkv|avi|mov)$/i, '');
            const actualUploadKey = `${category}/${folder ? folder + '/' : ''}${folderName}/input${originalExt}`;
            
            await uploadSingleFile(bucket, actualUploadKey, fileBuffer, mimetype);
            key = `${category}/${folder ? folder + '/' : ''}${folderName}`; // Return folder path as 'key'
          } else {
            await uploadSingleFile(bucket, key, fileBuffer, mimetype);
          }

          // 4. Update req.file so the controller knows the new location
          req.file.filename = filename;
          req.file.key = key; // S3 uses 'key' instead of 'path'
          req.file.mimetype = mimetype;
          req.file.location = `${storagePublicUrlPrefix(bucket)}${key}`;

          next();
        } catch (error) {
          return next(error);
        }
      });
    };
  };

  return instance;
};

// Helper function to create file filter
export function createFileFilter() {
  return (req: any, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
    const type = req.body.type ?? req.query.type;
    logger.debug('File filter invoked', { type });
    // Define MIME types for each category
    const allowedTypes = {
      image: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'image/bmp', 'image/tiff', 'image/x-icon', 'image/vnd.microsoft.icon'
      ],
      document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv', 'application/rtf'
      ],
      video: [
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
        'video/x-ms-wmv', 'video/webm', 'video/ogg', 'video/x-matroska'
      ],
      audio: [
        'audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'audio/x-mp3',
        'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/vnd.wave',
        'audio/ogg', 'application/ogg', 'audio/webm',
        'audio/flac', 'audio/x-flac',
        'audio/aac', 'audio/x-aac',
        'audio/x-m4a', 'audio/mp4',
        'audio/x-ms-wma', 'audio/x-midi'
      ],
      lyrics: [
        'text/plain', 'text/vtt', 'text/x-ssa',
        'application/x-subrip',
        'application/json',
        'text/lrc', 'application/lrc',
        'application/xml', 'text/xml'
      ],
      subtitle: [
        'text/vtt', 'application/x-subrip', 'text/x-ssa', 'application/x-ssa',
        'text/srt', 'application/srt'
      ],
      // Combined categories
      music: [
        // Audio types
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac',
        // Lyrics types
        'text/plain', 'application/json', 'text/vtt', 'application/x-subrip', 'text/lrc'
      ],
      media: [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        // Videos
        'video/mp4', 'video/webm', 'video/ogg',
        // Audio
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac'
      ]
    };

    // Check if the requested type exists in our allowedTypes
    if (!allowedTypes[type]) {
      return callback(new Error(`Unsupported file type category: ${type}`));
    }

    // Get the allowed MIME types for the requested category
    const allowedMimeTypes = allowedTypes[type];

    // Check if file MIME type is allowed
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      // Get file extension for better error message
      const ext = file.originalname.split('.').pop()?.toLowerCase() || 'unknown';

      callback(new Error(
        `File type not allowed for category "${type}".\n` +
        `Received: ${file.mimetype} (.${ext})\n` +
        `Allowed types: ${allowedMimeTypes.join(', ')}`
      ));
    }
  };
}
