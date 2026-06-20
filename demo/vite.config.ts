import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'demo',
  resolve: {
    alias: {
      'super-chat': resolve(__dirname, '../dist'),
      'super-chat/react': resolve(__dirname, '../dist/react'),
    },
  },
  server: {
    port: 3456,
    host: true,
  },
});
