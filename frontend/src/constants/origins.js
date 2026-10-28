export const LOCAL_API_URL = '/api/v1';
export const CLOUD_API_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://vendor-api.znix.online/api/v1';

const normalizeServerMode = (value) => {
  const mode = String(value || 'local').trim().toLowerCase();
  return mode === 'cloud' ? 'cloud' : 'local';
};

export const SERVER_MODE = normalizeServerMode(import.meta.env.VITE_SERVER);

export const resolveApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (SERVER_MODE === 'cloud') {
    return CLOUD_API_URL;
  }
  return LOCAL_API_URL;
};
