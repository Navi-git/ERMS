/**
 * Helper to resolve media and avatar URLs.
 * Handles:
 * - Full URLs (e.g. Google OAuth avatars: https://lh3.googleusercontent.com/...)
 * - Local blob URLs for live previews (blob:http://...)
 * - Django backend relative media paths (e.g. /media/profile_photos/xyz.jpg)
 */
export const resolvePhotoUrl = (url) => {
  if (!url) return null;
  if (
    url.startsWith('blob:') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const backendBase = rawBase.replace(/\/api\/v1\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
};

export const resolveMediaUrl = (url, token = null) => {
  if (!url) return '';
  let fullUrl = url;
  if (
    !url.startsWith('blob:') &&
    !url.startsWith('http://') &&
    !url.startsWith('https://') &&
    !url.startsWith('data:')
  ) {
    const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const backendBase = rawBase.replace(/\/api\/v1\/?$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    fullUrl = `${backendBase}${cleanPath}`;
  }
  if (token && !fullUrl.includes('token=')) {
    const separator = fullUrl.includes('?') ? '&' : '?';
    fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  return fullUrl;
};


