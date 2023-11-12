import store from '@/store';
import router from '@/router';

const api = {
  call: (method, url, input) => {
    let path = `${store.state.api.endpoint}/${url}`;
    return fetch(path, {
      method,

      // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
      mode: 'cors',
      credentials: 'include',

      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:8080',
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
