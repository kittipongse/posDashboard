export const LOCAL_API_URL = '/api/v1';
export const CLOUD_API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://vendor-api.delight-herbal-house.com/api/v1';

const API_BY_HOSTNAME = {
  'vendor.delight-herbal-house.com': 'https://vendor-api.delight-herbal-house.com/api/v1',
  'vendor.znix.online': 'https://vendor-api.znix.online/api/v1'
};

const normalizeServerMode = (value) => {
  const mode = String(value || 'local').trim().toLowerCase();
  return mode === 'cloud' ? 'cloud' : 'local';
};

export const SERVER_MODE = normalizeServerMode(import.meta.env.VITE_SERVER);

export const resolveApiUrl = () => {
  if (typeof window !== 'undefined') {
    const mapped = API_BY_HOSTNAME[window.location.hostname];
    if (mapped) return mapped;
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (SERVER_MODE === 'cloud' || import.meta.env.PROD) {
    return CLOUD_API_URL;
  }
  return LOCAL_API_URL;
};
