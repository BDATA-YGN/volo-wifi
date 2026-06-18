import { Route } from '@/interfaces/express.interface';
import { Router } from 'express';
import { Controller } from './controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import multer from 'multer';
import { json } from 'express';

export class UploadRoute implements Route {
  public path = '/upload';
  public router = Router();
  public controller = new Controller();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/image`, this.controller.uploadImage);
    this.router.post(`${this.path}/storage`, this.controller.uploadAssets);
    this.router.get(`${this.path}/categories`, AuthMiddleware, this.controller.listCategories);
    this.router.post(`${this.path}/categories`, AuthMiddleware, this.controller.createCategory);
    this.router.delete(`${this.path}/categories`, AuthMiddleware, this.controller.deleteCategory);
    
    // Chunk upload routes
    this.router.post(`${this.path}/chunk/init`, this.controller.initChunkUpload);
    
    // Use memory storage for chunk uploads
    const chunkUpload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max chunk size
    });
    
    this.router.post(`${this.path}/chunk`, chunkUpload.single('chunk'), this.controller.uploadChunk);
    
    // Complete endpoint - use JSON parser, not multer
    this.router.post(`${this.path}/chunk/complete`, json(), this.controller.completeChunkUpload);

    // Processing management
    this.router.post(`${this.path}/processing/cancel`, AuthMiddleware, json(), this.controller.cancelProcessing);
    this.router.post(`${this.path}/processing/retry`, AuthMiddleware, json(), this.controller.retryProcessing);
    this.router.post(`${this.path}/sync`, AuthMiddleware, this.controller.syncFilesFromStorage);

    // HLS Stream Proxy
    this.router.get(`${this.path}/stream/hls/:id/:file`, this.controller.streamHlsProxy);
  }
}
