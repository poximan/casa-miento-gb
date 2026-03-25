import jwt from 'jsonwebtoken';
import { ConfigError, requiredEnv } from './config.js';

export class UnauthorizedError extends Error {
  constructor(message = 'No autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = 'UNAUTHORIZED';
  }
}

const adminUser = () => requiredEnv('ADMIN_USER');
const adminPass = () => requiredEnv('ADMIN_PASS');

const jwtSecret = () => requiredEnv('ADMIN_JWT_SECRET');
const jwtTtlMinutes = () => {
  const raw = process.env.ADMIN_JWT_TTL_MINUTES;
  if (raw === undefined || raw === null || raw === '') return 720;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new ConfigError('ADMIN_JWT_TTL_MINUTES');
  return parsed;
};

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
