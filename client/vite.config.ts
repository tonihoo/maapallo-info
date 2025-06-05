import react from '@vitejs/plugin-react';
import { CommonServerOptions, defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';

const serverOptions: CommonServerOptions = {
  host: '0.0.0.0',
  port: 8080,
  proxy: {
    '/api': 'http://server:3003',
  },
};

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: { plugins: ['@emotion/babel-plugin'] },
    }),
    tsconfigPaths(),
    process.env.NODE_ENV === 'development' &&
      checker({
        typescript: {
          buildMode: true,
        },
        overlay: {
          initialIsOpen: false,
        },
      }),
  ],
  build: {
    outDir: 'dist',
    commonjsOptions: {
      include: [/shared/, /node_modules/],
    },
  },
  server: serverOptions,
  preview: serverOptions,
});
