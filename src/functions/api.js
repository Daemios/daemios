import router from '@/router';

// Resolve API base endpoint without depending on a global store
function resolveApiBase() {
  try {
    // Prefer Vite env variable if provided, else default localhost
    const fromEnv = (import.meta && import.meta.env && import.meta.env.VITE_API_ENDPOINT)
      ? import.meta.env.VITE_API_ENDPOINT
      : null;
    return fromEnv || 'http://localhost:3000';
  } catch (e) {
    return 'http://localhost:3000';
  }
}
const API_BASE = resolveApiBase();
const IS_DEV = typeof window !== 'undefined' && window.location && window.location.port;

const api = {
  call: (method, url, input) => {
  const suffix = String(url || '').replace(/^\//, '');
  // In dev, prefer the Vite proxy under /api to avoid CORS
  const path = IS_DEV ? `/api/${suffix}` : `${API_BASE.replace(/\/$/, '')}/${suffix}`;
    return fetch(path, {
      method,

      // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
      mode: 'cors',
      credentials: 'include',

  headers: {
        'X-Organization-Alias': 'web-client',
        'Cache-Control': 'no-cache',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },

      body: method === 'POST' || method === 'PATCH' ? JSON.stringify(input) : null,
    })
      .then((response) => {
        console.log(response);
        // If there is something wrong
        if (!response.ok) {
          switch (response.status) {
            case 401:
              if (document.location.pathname !== '/login') {
                router.push('/login');
              }
              break;
            default:
              // TODO create error dialog/toast
          }
          throw new Error();
        }
        return response;
      })
  .then((response) => response.json())
  },
  get: (url, input) => api.call('GET', url, input),
  post: (url, input) => api.call('POST', url, input),
  patch: (url, input) => api.call('PATCH', url, input),
  delete: (url, input) => api.call('DELETE', url, input)
}

export default api;
