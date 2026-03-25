import { assertAdminCredentials, createAdminToken, UnauthorizedError } from '../server/admin-auth.js';
import { isConfigError, sendSafeConfigError } from '../server/config.js';

const clientIp = (req) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    const [first] = forwarded.split(',');
    if (first) return first.trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
};

const clientMeta = (req, extra = {}) => ({
  ip: clientIp(req),
  userAgent: req.headers?.['user-agent'] || 'unknown',
  ...extra,
});

const logLoginEvent = (level, message, req, extra = {}) => {
  const payload = clientMeta(req, extra);
  if (level === 'error') {
    console.error(`[admin-login] ${message}`, payload);
  } else if (level === 'warn') {
    console.warn(`[admin-login] ${message}`, payload);
  } else {
    console.info(`[admin-login] ${message}`, payload);
  }
};

const parseBody = async (req) => {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
};

const withCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req, res) {
  withCors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }

  let username = '';
  try {
    const body = await parseBody(req);
    username = (body.username || '').trim();
    const password = body.password || '';

    if (!username || !password) {
      logLoginEvent('warn', 'Intento rechazado por datos incompletos.', req, { username: username || '(empty)' });
      res.status(400).json({ error: 'Usuario y clave son obligatorios.' });
      return;
    }

    logLoginEvent('info', 'Intento de login recibido.', req, { username });
    assertAdminCredentials(username, password);
    const token = createAdminToken(username);
    logLoginEvent('info', 'Login exitoso.', req, { username });
    res.status(200).json({ token });
  } catch (err) {
    if (isConfigError(err)) {
      logLoginEvent('error', 'Falta configuracion para el login.', req, { username, missingKeys: err.missingKeys });
      sendSafeConfigError(res);
      return;
    }
    if (err instanceof UnauthorizedError) {
      logLoginEvent('warn', 'Credenciales invalidas.', req, { username });
      res.status(401).json({ error: err.message, code: 'UNAUTHORIZED' });
      return;
    }
    logLoginEvent('error', 'Error inesperado procesando el login.', req, { username, error: err?.message });
    res.status(500).json({ error: 'Error interno.' });
  }
}
