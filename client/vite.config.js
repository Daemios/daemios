import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
    ],
    // Ensure Vuetify is treated correctly by Vite's optimizer and SSR handling.
    // This prevents Vite from rewriting component CSS imports to paths that
    // don't exist in certain package builds.
    optimizeDeps: {
      include: ['vuetify'],
    },
    ssr: {
      noExternal: ['vuetify'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      host: env.VITE_DEV_HOST || 'localhost',
      proxy: {
        '/api': {
          target: env.VITE_API_ENDPOINT || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/?/, '/'),
        },
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  };
});
