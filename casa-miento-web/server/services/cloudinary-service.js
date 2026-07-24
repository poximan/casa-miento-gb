import { requiredEnv } from '../config.js';

const cloudinaryCloudName = () => requiredEnv('CLOUDINARY_CLOUD_NAME');
const cloudinaryApiKey = () => requiredEnv('CLOUDINARY_API_KEY');
const cloudinaryApiSecret = () => requiredEnv('CLOUDINARY_API_SECRET');
const cloudinaryFolder = () => requiredEnv('CLOUDINARY_FOLDER');

const basicAuthHeader = () =>
  `Basic ${Buffer.from(`${cloudinaryApiKey()}:${cloudinaryApiSecret()}`).toString('base64')}`;

export class CloudinaryServiceError extends Error {
  constructor({ status, code, publicMessage, hint, technicalMessage }) {
    super(technicalMessage || publicMessage);
    this.name = 'CloudinaryServiceError';
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
    this.hint = hint;
  }
}

const cloudinaryError = (options) => new CloudinaryServiceError(options);

const mapCloudinaryHttpError = (status, responseText) => {
  const technicalMessage = `Cloudinary HTTP ${status} | ${responseText.slice(0, 200)}`;

  if (status === 400) {
    return cloudinaryError({
      status: 400,
      code: 'CLOUDINARY_BAD_REQUEST',
      publicMessage: 'Cloudinary rechazo la solicitud enviada por el backend.',
      hint: 'Revisa el payload y el formato de los assets enviados.',
      technicalMessage,
    });
  }

  if (status === 401 || status === 403) {
    return cloudinaryError({
      status: 502,
      code: 'CLOUDINARY_AUTH_FAILED',
      publicMessage: 'No se pudo autenticar contra Cloudinary.',
      hint: 'Revisa cloud name, api key y api secret del backend.',
      technicalMessage,
    });
  }

  if (status === 404) {
    return cloudinaryError({
      status: 404,
      code: 'CLOUDINARY_NOT_FOUND',
      publicMessage: 'El recurso solicitado no existe en Cloudinary.',
      hint: 'Actualiza el listado de assets y vuelve a intentar.',
      technicalMessage,
    });
  }

  if (status === 429) {
    return cloudinaryError({
      status: 503,
      code: 'CLOUDINARY_RATE_LIMIT',
      publicMessage: 'Cloudinary rechazo temporalmente la operacion por limite de uso.',
      hint: 'Espera un momento y vuelve a intentar.',
      technicalMessage,
    });
  }

  if (status >= 500) {
    return cloudinaryError({
      status: 503,
      code: 'CLOUDINARY_UNAVAILABLE',
      publicMessage: 'Cloudinary no esta disponible en este momento.',
      hint: 'Vuelve a intentar cuando el servicio se normalice.',
      technicalMessage,
    });
  }

  return cloudinaryError({
    status: 502,
    code: 'CLOUDINARY_REQUEST_FAILED',
    publicMessage: 'No se pudo completar la operacion con Cloudinary.',
    hint: 'Revisa logs del backend para mas detalle tecnico.',
    technicalMessage,
  });
};

const requestCloudinary = async (url, options = {}) => {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: basicAuthHeader(),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw cloudinaryError({
      status: 503,
      code: 'CLOUDINARY_NETWORK_ERROR',
      publicMessage: 'No se pudo conectar con Cloudinary.',
      hint: 'Revisa conectividad del backend hacia Cloudinary.',
      technicalMessage: error?.message || 'Cloudinary network error',
    });
  }

  const text = await response.text().catch(() => '');
  if (!response.ok) {
    throw mapCloudinaryHttpError(response.status, text);
  }

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw cloudinaryError({
      status: 502,
      code: 'CLOUDINARY_INVALID_RESPONSE',
      publicMessage: 'Cloudinary devolvio una respuesta invalida.',
      hint: 'Revisa el estado del servicio y vuelve a intentar.',
      technicalMessage: text.slice(0, 200),
    });
  }
};

export const listAssets = async () => {
  const payload = {
    expression: `resource_type:image AND folder:${cloudinaryFolder()}`,
    max_results: 100,
    sort_by: [{ public_id: 'desc' }],
  };

  const data = await requestCloudinary(
    `https://api.cloudinary.com/v1_1/${cloudinaryCloudName()}/resources/search`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const resources = Array.isArray(data.resources) ? data.resources : [];
  return resources.map((resource) => ({
    publicId: resource.public_id,
    url: resource.secure_url || resource.url,
  }));
};

export const deleteAssets = async (publicIds) => {
  const params = publicIds.map((id) => `public_ids[]=${encodeURIComponent(id)}`).join('&');
  await requestCloudinary(
    `https://api.cloudinary.com/v1_1/${cloudinaryCloudName()}/resources/image/upload?${params}`,
    { method: 'DELETE' }
  );
};

export const uploadAsset = async ({ fileName, mimeType, base64Data }) => {
  const dataUri = `data:${mimeType};base64,${base64Data}`;
  const body = new URLSearchParams({
    file: dataUri,
    folder: cloudinaryFolder(),
  });

  if (fileName) {
    body.set('filename_override', fileName);
  }

  const response = await requestCloudinary(
    `https://api.cloudinary.com/v1_1/${cloudinaryCloudName()}/image/upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }
  );

  return {
    publicId: response.public_id,
    url: response.secure_url || response.url,
  };
};
