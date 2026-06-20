import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'demo',
  resolve: {
    alias: {
      'super-chat': resolve(__dirname, '../src'),
      'super-chat/react': resolve(__dirname, '../src/react'),
    },
  },
  server: {
    port: 3000,
    host: true,
    fs: {
      allow: ['..'],
    },
  },
  // Expose env vars to the client
  define: {
    'import.meta.env.VITE_DEEPSEEK_API_KEY': JSON.stringify(process.env.VITE_DEEPSEEK_API_KEY || ''),
    'import.meta.env.VITE_KIMI_API_KEY': JSON.stringify(process.env.VITE_KIMI_API_KEY || ''),
    'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(process.env.VITE_OPENROUTER_API_KEY || ''),
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || ''),
    'import.meta.env.VITE_DEFAULT_PROVIDER': JSON.stringify(process.env.VITE_DEFAULT_PROVIDER || 'deepseek'),
  },
});
