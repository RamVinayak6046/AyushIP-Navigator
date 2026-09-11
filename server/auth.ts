import * as crypto from 'crypto';
import { AuthUser, AuthToken, UserRole, APIResponse } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ayuship-navigator-dev-secret-2026';
const DEMO_MODE = process.env.DEMO_MODE === 'true';

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

/**
 * Hashes a plaintext password using PBKDF2 with a random salt.
 * @param plaintext The plaintext password
 * @returns A promise that resolves to the formatted salt:hash string
 */
export function hashPassword(plaintext: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(plaintext, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored hash.
 * @param plaintext The plaintext password to check
 * @param storedHash The stored salt:hash string
 * @returns A promise that resolves to a boolean indicating whether the password is correct
 */
export function verifyPassword(plaintext: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!storedHash || !storedHash.includes(':')) {
      return resolve(false);
    }
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) {
      return resolve(false);
    }
    crypto.pbkdf2(plaintext, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
}

/**
 * Helper to encode string/buffer to base64url format
 */
function base64urlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Helper to decode base64url format to string
 */
function base64urlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Generates an HMAC-SHA256 signed token for a user.
 * @param user The authenticated user
 * @returns The signed token string
 */
export function generateToken(user: AuthUser): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 24 * 60 * 60; // 24 hours
  
  const payload: AuthToken = {
    userId: (user as any).id || (user as any).userId || 'unknown',
    email: user.email,
    role: user.role,
    iat,
    exp
  };
  
  const payloadStr = JSON.stringify(payload);
  const encodedPayload = base64urlEncode(payloadStr);
  
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(encodedPayload);
  const signature = base64urlEncode(hmac.digest());
    
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a token.
 * @param token The token string to verify
 * @returns The decoded token payload, or null if invalid/expired
 */
export function verifyToken(token: string): AuthToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    
    const [encodedPayload, signature] = parts;
    
    const hmac = crypto.createHmac('sha256', JWT_SECRET);
    hmac.update(encodedPayload);
    const expectedSignature = base64urlEncode(hmac.digest());
      
    if (signature !== expectedSignature) return null;
    
    const payloadStr = base64urlDecode(encodedPayload);
    const payload = JSON.parse(payloadStr) as AuthToken;
    
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Express middleware to authenticate requests via Bearer token.
 */
export function authMiddleware(req: any, res: any, next: any): void {
  if (DEMO_MODE) {
    req.user = {
      id: 'demo-user-id',
      email: 'demo@example.com',
      role: 'ADMIN'
    } as AuthUser;
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response = { success: false, error: 'Unauthorized' };
    res.status(401).json(response);
    return;
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    const response = { success: false, error: 'Invalid or expired token' };
    res.status(401).json(response);
    return;
  }
  
  req.user = {
    id: decoded.userId,
    email: decoded.email,
    role: decoded.role
  } as AuthUser;
  
  next();
}

/**
 * Express middleware factory to restrict routes to specific roles.
 * @param allowedRoles List of roles permitted to access the route
 */
export function roleGuard(...allowedRoles: UserRole[]): (req: any, res: any, next: any) => void {
  return (req: any, res: any, next: any) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const response = { success: false, error: 'Forbidden: Insufficient privileges' };
      res.status(403).json(response);
      return;
    }
    next();
  };
}

/**
 * Express middleware to restrict routes to ADMIN only.
 */
export const adminOnly = roleGuard('ADMIN');
