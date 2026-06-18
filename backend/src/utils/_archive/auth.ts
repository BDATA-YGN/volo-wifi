import { InvalidPayloadException } from '@/utils/exception';
import { NextFunction, Request } from 'express';
import { DeviceInfo } from '@/interfaces/express.interface';
import {logger} from '../logging/logger';
import { createHash } from 'crypto';

export const getDeviceInfo = async (req: Request): Promise<DeviceInfo> => {
    const deviceId = req.header('device-id') || null;
    const deviceOs = req.header('device-os') || null;
    const deviceType = req.header('device-type') || null;

    logger.info({
      function: 'getDeviceInfo',
      payload: {
        requestBody: req.body,
        requestHeader: req.headers
      }
    })

    if (!deviceId) throw new InvalidPayloadException('Invalid Payload', [{ location: 'request.header', field: 'device-id', message: 'device-id is required' }]);

    return { device_id: deviceId, device_os: deviceOs, device_type: deviceType };
};

export function hashId(id: number) {
  return createHash('sha256').update(id.toString()).digest('hex');
}
