import 'express';

declare global {
  namespace Express {
    // Provided by `@types/multer`
    // We extend Request so `req.file`/`req.files` are type-safe across the codebase.
    interface Request {
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }
  }
}

export {};

