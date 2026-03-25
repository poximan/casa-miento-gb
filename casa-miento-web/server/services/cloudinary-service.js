import { requiredEnv } from '../config.js';

const cloudinaryCloudName = () => requiredEnv('CLOUDINARY_CLOUD_NAME');
const cloudinaryApiKey = () => requiredEnv('CLOUDINARY_API_KEY');
const cloudinaryApiSecret = () => requiredEnv('CLOUDINARY_API_SECRET');
const cloudinaryFolder = () => requiredEnv('CLOUDINARY_FOLDER');

const basicAuthHeader = () =>
  `Basic ${Buffer.from(`${cloudinaryApiKey()}:${cloudinaryApiSecret()}`).toString('base64')}`;

const requestCloudinary = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: basicAuthHeader(),
      ...(options.headers || {}),
    },
  });

  const text = await response.text().catch(() => '');
  if (!response.ok) {
    throw new Error(`Cloudinary HTTP ${response.status} | ${text.slice(0, 200)}`);
  }

  return text ? JSON.parse(text) : {};
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
