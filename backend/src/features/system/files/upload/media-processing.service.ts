import { logger } from '@/logging/logger';
import { WebSocketService } from '@/third-party/bdataSocket';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as MinioService from '@/features/system/files/minio/service';
import { MINIO_PRIVATE_BUCKET, MINIO_PUBLIC_BUCKET } from '@/config';
import Container from 'typedi';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { FileLog } from '@/generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';
import ffmpegStatic from 'ffmpeg-static';

const FFMPEG_PATH = ffmpegStatic || 'ffmpeg';

export class MediaProcessingService {
  private activeProcesses: Map<string | number, ChildProcess> = new Map();

  private get socketService() {
    try {
      return WebSocketService.getInstance();
    } catch (e) {
      return null;
    }
  }

  private get fileLogService() {
    return Container.get<BaseService<FileLog, any>>('fileLogService');
  }

  public async cancelProcessing(fileId: number, userId?: string) {
    const process = this.activeProcesses.get(fileId);
    if (process) {
      process.kill('SIGTERM');
      this.activeProcesses.delete(fileId);
      this.emitProgress(fileId, 'Processing cancelled by user', 0, userId, 'warning');
      return true;
    }
    return false;
  }

  public async retryProcessing(fileId: number, userId?: string) {
    try {
      const fileLog = await this.fileLogService.baseModel().findUnique({
        where: { id: fileId }
      });

      if (!fileLog) {
        throw new Error('File log not found');
      }

      // Ensure it's not already processing
      if (this.activeProcesses.has(fileId)) {
        await this.cancelProcessing(fileId, userId);
      }

      // Start processing
      this.processMedia(fileLog, userId).catch(err => {
        logger.error(`Retry media processing error: ${err.message}`);
      });

      return true;
    } catch (error) {
      logger.error(`Error in retryProcessing: ${error.message}`);
      throw error;
    }
  }

  public async processMedia(fileLogOrMetadata: any, userId?: string) {
    const isNew = !fileLogOrMetadata.id;
    const trackingId = fileLogOrMetadata.trackingId || (fileLogOrMetadata.id ? String(fileLogOrMetadata.id) : `job_${uuidv4()}`);
    
    logger.info(`[MediaProcessing] Job Started: ${trackingId}`, { 
      fileName: fileLogOrMetadata.fileName,
      url: fileLogOrMetadata.url,
      bucket: fileLogOrMetadata.bucket,
      isPublic: fileLogOrMetadata.isPublic,
      type: fileLogOrMetadata.type
    });

    const { type, fileName, url, isPublic, bucket: bucketName, parentId } = fileLogOrMetadata;
    
    if (type !== 'audio' && type !== 'video') {
      logger.warn(`[MediaProcessing] Invalid media type for job ${trackingId}: ${type}`);
      return;
    }

    const bucket = bucketName || (isPublic === true || isPublic === 'true' ? MINIO_PUBLIC_BUCKET : MINIO_PRIVATE_BUCKET);
    const baseName = path.parse(fileName).name;
    const tempDir = path.join(process.cwd(), 'temp_hls', `${trackingId}_${Date.now()}`);
    const inputPath = path.join(tempDir, fileName);
    
    // Strip extension for the HLS folder name and storage path
    const strippedFileName = fileName.replace(/\.[^/.]+$/, "");
    const originalFileKey = url.startsWith('/') ? url.substring(1) : url;
    const remoteFolderPath = originalFileKey.replace(/\.[^/.]+$/, "");
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileExtension = path.extname(fileName);
    const inputKey = `${originalFileKey}/input${fileExtension}`;
    
    try {
      this.emitProgress(trackingId, 'Initializing media processing...', 5, userId);

      logger.info(`Downloading input file from Minio [${bucket}]: ${inputKey} -> ${inputPath}`);
      
      // Use getObject stream with retries for more robust downloading
      let downloadSuccess = false;
      let retries = 3;
      while (retries > 0 && !downloadSuccess) {
        try {
          const stream = await MinioService.minioClient.getObject(bucket, inputKey);
          await new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(inputPath);
            stream.pipe(fileStream);
            stream.on('error', (err) => {
              fileStream.close();
              reject(err);
            });
            fileStream.on('finish', () => resolve(undefined));
            fileStream.on('error', (err) => {
              fileStream.close();
              reject(err);
            });
          });
          downloadSuccess = true;
        } catch (err: any) {
          retries--;
          logger.warn(`[MediaProcessing] Download retry ${3 - retries} for ${inputKey}: ${err.message}`);
          if (retries === 0) throw err;
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); // Clean up partial file
          await new Promise(r => setTimeout(r, 3000)); // Wait 3s before retry
        }
      }

      this.emitProgress(trackingId, 'Processing media...', 10, userId);

      if (type === 'video') {
        await this.processVideo(trackingId, inputPath, tempDir, baseName, bucket, remoteFolderPath, userId);
      } else if (type === 'audio') {
        await this.processAudio(trackingId, inputPath, tempDir, baseName, bucket, remoteFolderPath, userId);
      }

      // Cleanup: Remove the original input file from the local temp dir before indexing
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }

      // Use the actual folder name from storage (which includes the timestamp) as the record name
      const actualFolderName = path.basename(remoteFolderPath);
      let folderLogId = fileLogOrMetadata.id;

      if (isNew) {
        // Create new log record for the folder
        const folderLog = await this.fileLogService.baseModel().create({
          data: {
            fileName: actualFolderName,
            url: remoteFolderPath,
            originalName: fileLogOrMetadata.originalName || fileLogOrMetadata.fileName,
            size: fileLogOrMetadata.size,
            type: fileLogOrMetadata.type,
            mimeType: 'folder/hls',
            category: fileLogOrMetadata.category,
            bucket: bucket,
            folder: fileLogOrMetadata.folder,
            parentId: parentId || undefined,
            authorId: userId || 'system',
            isPublic: isPublic,
            isFolder: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        folderLogId = folderLog.id;
      } else {
        // Update database: mark as folder and update metadata
        await this.fileLogService.baseModel().update({
          where: { id: fileLogOrMetadata.id },
          data: { 
            fileName: actualFolderName,
            url: remoteFolderPath,
            size: fileLogOrMetadata.size,
            mimeType: 'folder/hls',
            isFolder: true, 
            updatedAt: new Date() 
          }
        });
      }

      // Record all sub-files in the database
      this.emitProgress(trackingId, 'Indexing sub-files...', 95, userId);
      await this.recordSubFiles(tempDir, remoteFolderPath, bucket, folderLogId, {
        ...fileLogOrMetadata,
        folder: `${fileLogOrMetadata.folder}/${actualFolderName}`
      });

      // Cleanup: Also remove the 'input' file from Minio as HLS is now ready
      try {
        await MinioService.minioClient.removeObject(bucket, inputKey);
        logger.info(`[MediaProcessing] Cleaned up original input file: ${inputKey}`);
      } catch (cleanupErr: any) {
        logger.warn(`[MediaProcessing] Failed to cleanup input file ${inputKey}: ${cleanupErr.message}`);
      }

      this.emitProgress(trackingId, 'Media processing completed successfully!', 100, userId, 'success');
    } catch (error: any) {
      if (error.message === 'SIGTERM' || error.message === 'cancelled') {
        logger.info(`Processing for job ${trackingId} was cancelled.`);
      } else {
        logger.error(`[MediaProcessing] Fatal Error for job ${trackingId} [Bucket: ${bucket}, Key: ${inputKey}]: ${error.message}`);
        if (error.stack) logger.error(error.stack);
        
        // Also log some connection diagnostic info if it's a credential error
        if (error.message.includes('credentials') || error.message.includes('authorized') || error.message.includes('Forbidden')) {
          const client = (MinioService.minioClient as any);
          logger.error(`[MediaProcessing] Diagnostic Info: Endpoint=${client.endPoint}, Port=${client.port}, SSL=${client.useSSL}, Region=${client.region}, PathStyle=${client.pathStyle}`);
        }

        this.emitProgress(trackingId, `Error: ${error.message}`, 0, userId, 'error');
      }
    } finally {
      this.activeProcesses.delete(trackingId);
      // Cleanup temp dir
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  private async recordSubFiles(localFolder: string, remoteFolder: string, bucket: string, parentId: string, metadata: any) {
    const files = fs.readdirSync(localFolder);
    for (const file of files) {
      const localPath = path.join(localFolder, file);
      const stats = fs.statSync(localPath);
      if (stats.isFile()) {
        const mimeType = this.getContentType(file);
        const type = mimeType.split('/')[0];
        await this.fileLogService.baseModel().create({
          data: {
            fileName: file,
            url: `${remoteFolder}/${file}`,
            originalName: file,
            size: stats.size,
            type: type === 'application' ? 'document' : type,
            mimeType: mimeType,
            category: metadata.category,
            bucket: bucket,
            folder: metadata.folder,
            parentId: parentId,
            authorId: metadata.authorId || 'system',
            isPublic: metadata.isPublic,
            isFolder: false,
          }
        }).catch(err => {
          logger.error(`Failed to record sub-file ${file}: ${err.message}`);
        });
      }
    }
  }

  private runFFmpeg(id: string | number, args: string[], userId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // ffmpeg prints progress/logs to stderr by default
      const ffmpeg = spawn(FFMPEG_PATH, args);
      this.activeProcesses.set(id, ffmpeg);

      ffmpeg.stderr.on('data', (data) => {
        const log = data.toString();
        // Emit log line to socket
        this.emitLog(id, log, userId);
      });

      ffmpeg.on('close', (code) => {
        this.activeProcesses.delete(id);
        if (code === 0) {
          resolve();
        } else if (code === null) {
          reject(new Error('cancelled'));
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        this.activeProcesses.delete(id);
        reject(err);
      });
    });
  }

  private emitLog(fileId: string | number, log: string, userId?: string | number) {
    try {
      const socket = this.socketService;
      if (!socket) return;

      const fileIdStr = String(fileId);
      const userIdStr = userId ? String(userId) : undefined;

      if (userIdStr) {
        socket.sendSocketEvent({
          event: 'REGISTER_CONSOLE_ADMIN',
          eventId: userIdStr,
          type: 'media_processing_log',
          data: { fileId: fileIdStr, log },
          timestamp: new Date()
        }).catch(() => undefined); // Silent catch for high-frequency logs
      }
      
      // Always broadcast as well to ensure maximum visibility for standard listeners
      socket.broadcast('media_processing_log', {
        fileId: fileIdStr,
        log,
        timestamp: new Date()
      }).catch(() => undefined);
    } catch (error) {
      // Ignore socket errors
    }
  }

  private emitProgress(fileId: string | number, message: string, progress: number, userId?: string | number, status: 'success' | 'info' | 'warning' | 'error' = 'info') {
    try {
      const socket = this.socketService;
      if (!socket) {
        logger.warn(`[MediaProcessing] Socket service not available for progress emission`);
        return;
      }

      const fileIdStr = String(fileId);
      const userIdStr = userId ? String(userId) : undefined;

      if (userIdStr) {
        socket.sendSocketEvent({
          event: 'REGISTER_CONSOLE_ADMIN',
          eventId: userIdStr,
          type: 'media_processing_progress',
          status,
          data: { fileId: fileIdStr, message, progress },
          timestamp: new Date()
        }).catch(err => logger.error(`Socket send error: ${err.message}`));
      }
      
      // Always broadcast as well to ensure maximum visibility for standard listeners
      socket.broadcast('media_processing_progress', {
        fileId: fileIdStr,
        message,
        progress,
        status,
        timestamp: new Date()
      }).catch(err => logger.error(`Socket broadcast error: ${err.message}`));
    } catch (error: any) {
      logger.error(`Error emitting socket progress: ${error.message}`);
    }
  }

  private async processVideo(id: string | number, inputPath: string, targetDir: string, baseName: string, bucket: string, url: string, userId?: string) {
    // 1. Original
    this.emitProgress(id, 'Generating original MP4...', 20, userId);
    const originalPath = path.join(targetDir, 'original.mp4');
    // Using 'faster' preset instead of 'slow' for better performance
    await this.runFFmpeg(id, [
      '-y', '-i', inputPath,
      '-c:v', 'libx264', '-preset', 'faster', '-crf', '20',
      '-c:a', 'aac', '-b:a', '192k',
      originalPath
    ], userId);

    // 2. HLS Standard
    this.emitProgress(id, 'Generating HLS standard variant...', 40, userId);
    const stdOut = path.join(targetDir, 'index.m3u8');
    await this.runFFmpeg(id, [
      '-y', '-i', inputPath,
      '-vf', 'scale=-2:480',
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '1000k',
      '-c:a', 'aac', '-b:a', '128k',
      '-hls_time', '2', '-hls_list_size', '0', '-f', 'hls',
      stdOut
    ], userId);

    // 3. HLS Preview
    this.emitProgress(id, 'Generating HLS preview variant...', 60, userId);
    const previewOut = path.join(targetDir, 'preview.m3u8');
    await this.runFFmpeg(id, [
      '-y', '-i', inputPath,
      '-t', '30',
      '-vf', 'scale=-2:360',
      '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '500k',
      '-c:a', 'aac', '-b:a', '64k',
      '-hls_time', '2', '-hls_list_size', '0', '-f', 'hls',
      previewOut
    ], userId);

    // 4. Master Playlist
    this.emitProgress(id, 'Generating master playlist...', 75, userId);
    const variants = [
      { name: 'standard', resolution: '480p', bandwidth: 1200000, playlist: 'index.m3u8' },
      { name: 'preview', resolution: '360p', bandwidth: 600000, playlist: 'preview.m3u8' }
    ];
    this.generateMasterPlaylist(targetDir, variants);

    // 5. Upload to MinIO
    await this.uploadFolder(id, targetDir, url.startsWith('/') ? url.substring(1) : url, bucket, userId, 85, 95);
  }

  private async processAudio(id: string | number, inputPath: string, targetDir: string, baseName: string, bucket: string, url: string, userId?: string) {
    // 1. Original MP3
    this.emitProgress(id, 'Generating original MP3 (320k)...', 15, userId);
    const originalPath = path.join(targetDir, 'original.mp3');
    await this.runFFmpeg(id, [
      '-y', '-i', inputPath,
      '-c:a', 'libmp3lame', '-b:a', '320k',
      originalPath
    ], userId);

    // 1.1 Original WAV
    this.emitProgress(id, 'Generating original WAV...', 25, userId);
    const wavPath = path.join(targetDir, 'original.wav');
    await this.runFFmpeg(id, [
      '-y', '-i', inputPath,
      '-c:a', 'pcm_s16le', '-ar', '44100',
      wavPath
    ], userId);

    // 2. HLS Variants
    const variants = [
      { name: 'low', bandwidth: 64000, playlist: 'low.m3u8', cmd: `-c:a aac -b:a 64k` },
      { name: 'standard', bandwidth: 128000, playlist: 'std.m3u8', cmd: `-c:a aac -b:a 128k` },
      { name: 'high', bandwidth: 320000, playlist: 'high.m3u8', cmd: `-c:a aac -b:a 320k` },
      { name: 'preview', bandwidth: 64000, playlist: 'preview.m3u8', cmd: `-t 30 -c:a aac -b:a 64k` }
    ];

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        this.emitProgress(id, `Generating HLS ${v.name} variant...`, 35 + (i * 12), userId);
        const out = path.join(targetDir, v.playlist);
      
      const args = [
        '-y', '-i', inputPath,
        ...v.cmd.split(' '),
        '-vn', '-hls_time', '2', '-hls_list_size', '0', '-f', 'hls',
        out
      ];
      await this.runFFmpeg(id, args, userId);
    }

    // 3. Master Playlist
    this.emitProgress(id, 'Generating master playlist...', 80, userId);
    this.generateMasterPlaylist(targetDir, variants, true);

    // 4. Upload to MinIO
    await this.uploadFolder(id, targetDir, url.startsWith('/') ? url.substring(1) : url, bucket, userId, 90, 95);
  }

  private generateMasterPlaylist(targetDir: string, variants: any[], isAudio = false) {
    let content = '#EXTM3U\n';
    variants.forEach(v => {
      if (isAudio) {
        content += `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},NAME="${v.name}"\n${v.playlist}\n`;
      } else {
        content += `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.resolution},NAME="${v.name}"\n${v.playlist}\n`;
      }
    });
    fs.writeFileSync(path.join(targetDir, 'playlist.m3u8'), content);
  }

  private async uploadFolder(id: string | number, localFolder: string, remoteFolder: string, bucket: string, userId?: string, startProgress = 85, endProgress = 98) {
    const files = fs.readdirSync(localFolder);
    const totalFiles = files.length;
    let uploadedCount = 0;

    for (const file of files) {
      const localPath = path.join(localFolder, file);
      const stats = fs.statSync(localPath);
      if (stats.isFile()) {
        const buffer = fs.readFileSync(localPath);
        const contentType = this.getContentType(file);
        const key = `${remoteFolder}/${file}`;
        await MinioService.uploadSingleFile(bucket, key, buffer, contentType);
        
        uploadedCount++;
        const currentProgress = Math.round(startProgress + ((uploadedCount / totalFiles) * (endProgress - startProgress)));
        if (uploadedCount % 5 === 0 || uploadedCount === totalFiles) {
          this.emitProgress(id, `Uploading segments (${uploadedCount}/${totalFiles})...`, currentProgress, userId);
        }
      }
    }
  }

  private getContentType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.m3u8') return 'application/x-mpegURL';
    if (ext === '.ts') return 'video/MP2T';
    if (ext === '.mp4') return 'video/mp4';
    if (ext === '.mp3') return 'audio/mpeg';
    return 'application/octet-stream';
  }
}

export const mediaProcessingService = new MediaProcessingService();

