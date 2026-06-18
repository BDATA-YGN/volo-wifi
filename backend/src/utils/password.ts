import { compare, hash } from 'bcrypt';

/** Cost factor for bcrypt (10–12 typical for admin consoles). */
export const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
  return hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  if (!plainPassword || !hashedPassword) return false;
  if (hashedPassword.startsWith('$2')) {
    return compare(plainPassword, hashedPassword);
  }
  // Legacy MD5 hex digests (pre-bcrypt); remove once all rows are migrated.
  if (/^[a-f0-9]{32}$/i.test(hashedPassword)) {
    const { default: md5 } = await import('md5');
    return md5(plainPassword) === hashedPassword;
  }
  return false;
}
