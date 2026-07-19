import { promisify } from 'util';
import {
  scrypt,
  randomBytes,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from 'crypto';
import { ENV } from '../../config/env';

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  const [salt, key] = hash.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(keyBuffer, derivedKey);
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const keyHex = ENV.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY is not set in the environment variables.');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encryptToken(data: string): string {
  const secretKey = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, secretKey, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts the formatted string back into plain text.
 */
export function decryptToken(encryptedPayload: string): string {
  const secretKey = getEncryptionKey();
  
  const parts = encryptedPayload.split(':');
  let ivHex: string;
  let authTagHex: string;
  let encryptedHex: string;

  if (parts.length === 3) {
    [ivHex, authTagHex, encryptedHex] = parts;
  } else if (parts.length === 2) {
    const combined = parts[0];
    encryptedHex = parts[1];
    ivHex = combined.substring(0, 24); // IV_LENGTH * 2 = 24 hex characters
    authTagHex = combined.substring(24);
  } else {
    throw new Error('Invalid encrypted token format.');
  }

  if (!ivHex || !authTagHex || !encryptedHex || ivHex.length !== 24 || authTagHex.length !== 32) {
    throw new Error('Invalid encrypted token format.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, secretKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
