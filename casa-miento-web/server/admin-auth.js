import jwt from 'jsonwebtoken';
import { requiredEnv, requiredIntEnv } from './config.js';

export class UnauthorizedError extends Error {
  constructor(message = 'No autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = 'UNAUTHORIZED';
  }
}

const adminUser = () => requiredEnv('ADMIN_USER');
const adminPass = () => requiredEnv('ADMIN_PASS');
const mobileOrganizerToken = () => (process.env.MOBILE_ORGANIZER_TOKEN || '').trim();

const jwtSecret = () => requiredEnv('ADMIN_JWT_SECRET');
const jwtTtlMinutes = () => requiredIntEnv('ADMIN_JWT_TTL_MINUTES');

export const createAdminToken = (username) => {
  const payload = { sub: 'admin', user: username };
  const secret = jwtSecret();
  const ttl = jwtTtlMinutes();
  return jwt.sign(payload, secret, { expiresIn: `${ttl}m` });
};

export const verifyAdminToken = (token) => {
  try {
    const payload = jwt.verify(token, jwtSecret());
    if (payload?.sub !== 'admin') {
      throw new UnauthorizedError('Token invalido.');
    }
    return payload;
  } catch {
    throw new UnauthorizedError('Token invalido o expirado.');
  }
};

export const verifyOrganizerToken = (token) => {
  try {
    return verifyAdminToken(token);
  } catch {
    const expectedMobileToken = mobileOrganizerToken();
    if (expectedMobileToken && token === expectedMobileToken) {
      return { sub: 'mobile-organizer' };
    }
    throw new UnauthorizedError('Token invalido o expirado.');
  }
};

export const assertAdminCredentials = (username, password) => {
  const expectedUser = adminUser();
  const expectedPass = adminPass();
  if (username === expectedUser && password === expectedPass) return true;
  throw new UnauthorizedError('Credenciales invalidas.');
};

export const extractBearerToken = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
};
