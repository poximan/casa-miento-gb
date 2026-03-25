export class ConfigError extends Error {
  constructor(missingKeys) {
    const keys = Array.isArray(missingKeys) ? missingKeys : [missingKeys];
    super(`Missing required configuration: ${keys.join(', ')}`);
    this.name = 'ConfigError';
    this.code = 'CONFIG_MISSING';
    this.missingKeys = keys;
  }
}

export const requiredEnv = (name) => {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    console.error('[config] Falta configuracion obligatoria.', { key: name });
    throw new ConfigError(name);
  }
  return value.trim();
};

export const requiredIntEnv = (name) => {
  const raw = requiredEnv(name);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConfigError(name);
  }
  return value;
};

export const requiredBooleanEnv = (name) => {
  const raw = requiredEnv(name);
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new ConfigError(name);
};

export const isConfigError = (error) => error?.code === 'CONFIG_MISSING';

export const sendSafeConfigError = (res) => {
  res.status(500).json({
    error: 'Configuracion incompleta del servicio. Contacta al administrador.',
    code: 'CONFIG_MISSING',
  });
};
