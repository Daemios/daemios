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
    let path = `${store.state.endpoint}/${url}`;
    if (method === 'GET' && input) {
      const params = new URLSearchParams();
      Object.keys(input).forEach((key) => {
        if (typeof input[key] === 'boolean') {
          params.append(key, input[key] ? '1' : '0');
        } else if (input[key] === null) {
          params.append(key, '');
        } else {
          params.append(key, input[key]);
        }
      });
      path = `${store.state.endpoint}/${url}?${params.toString()}`;
    }
    return fetch(path, {

      // Setup
      signal: store.state.controller.signal,
      method,

      // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
      mode: 'cors',
      credentials: 'omit',

      // Headers required for the SOM API
      headers: {
        [HEADERS.ALIAS]: store.state.session.organization.alias,
        [HEADERS.AUTH]: `Bearer ${store.state.session.token}`,
        [HEADERS.CACHE]: 'no-cache',
        [HEADERS.ACCEPT]: 'application/json',
        [HEADERS.CONTENT]: 'application/json',
      },

      // SOM API always requires JSON
      body: method === 'POST' || method === 'PATCH' ? JSON.stringify(input) : null,

    })
      .then((response) => {
        if (!response.ok) {
          switch (response.status) {
            // Authorization requests do a hard refresh to the login page rather than route
            // This is so that any state state is safely purged
            case CODES.AUTH_REQUIRED:
              document.location.href = '/login';
              break;
            default:
              // Setup API failure means something is really screwed up. Rather than notifying
              // the user and letting them try again, enforce a hard refresh (fatal)
              if (url === 'setup') {
                store.commit('overlay/showError', response.statusText);
              } else {
                store.commit('overlay/showWarning', response.statusText);
              }
          }
          throw new Error();
        }
        if (store.state.session.authenticated) {
          store.commit('session/setTimeoutEvent');
        }
        return response;
      })
      .then((response) => response.json())
      .then((json) => {
        Object.keys(json.state).forEach((key) => {
          store.commit(key, json.state[key]);
        });
        if (store.state.session.authenticated) {
          store.commit('session/setTimeoutEvent');
        }
        return json;
      })
      .catch((error) => {
        if (error.message !== 'The user aborted a request.') {
          return {
            status: 'SERVER_ERROR',
            message: 'An internal error occurred',
            output: null,
            state: null,
          };
        }
        return {
          status: 'OK',
          message: 'Success',
          output: null,
          state: null,
        };
      });
  },
  get: (url, input) => api.call('GET', url, input),
  post: (url, input) => api.call('POST', url, input),
  patch: (url, input) => api.call('PATCH', url, input),
  delete: (url, input) => api.call('DELETE', url, input),
};

export default api;
