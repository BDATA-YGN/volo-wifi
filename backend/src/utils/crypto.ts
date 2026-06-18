import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.REDIRECT_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error('REDIRECT_SECRET_KEY is required for encrypt/decrypt');
  }
  cachedKey = crypto.createHash('sha256').update(secret).digest();
  return cachedKey;
}

/**
 * Encrypt plain text (AES-256-GCM). Only call when REDIRECT_SECRET_KEY is configured.
 */
export const encrypt = (text: string): string => {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  const result = `${iv.toString('hex')}:${tag}:${encrypted}`;
  return Buffer.from(result).toString('base64');
};

/**
 * Decrypt a base64 payload produced by `encrypt`.
 */
export const decrypt = (encryptedBase64: string): string => {
  const key = getKey();
  const combined = Buffer.from(encryptedBase64, 'base64').toString();
  const [ivHex, tagHex, encryptedHex] = combined.split(':');
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Invalid encrypted payload format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
