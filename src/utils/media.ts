import { apiClient } from '../api/axiosClient';

/**
 * Resolves media/photo URLs from the backend API.
 * Photo URLs from the API are either absolute (S3 / external CDN) or relative to the API host (/uploads/...).
 */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const base = (apiClient.defaults.baseURL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

