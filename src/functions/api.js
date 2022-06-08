import store from '@/store';

// API headers
const HEADERS = {
  ALIAS: 'X-Organization-Alias',
  AUTH: 'Authorization',
  CACHE: 'Cache-Control',
  ACCEPT: 'Accept',
  CONTENT: 'Content-Type',
};

// HTTP codes
const CODES = {
  AUTH_REQUIRED: 401,
};

const api = {
  call: (method, url, input) => {
    return fetch(url, {
      method,

      // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
      mode: 'cors',
      credentials: 'omit',

      headers: {
        [HEADERS.ALIAS]: 'web-client',
        [HEADERS.CACHE]: 'no-cache',
        [HEADERS.ACCEPT]: 'application/json',
        [HEADERS.CONTENT]: 'application/json',
      },

      body: method === 'POST' || method === 'PATCH' ? JSON.stringify(input) : null,
    })
      .then((response) => {
        if (!response.ok) {
          switch (response.status) {
            // Authorization requests do a hard refresh to the login page rather than route
            // This is so that any state is safely purged
            case CODES.AUTH_REQUIRED:
              document.location.href = '/login';
              break;
            default:
              // Setup API failure means something is really screwed up. Rather than notifying
              // the user and letting them try again, enforce a hard refresh (fatal)
              //store.commit('overlay/showWarning', response.statusText);
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
