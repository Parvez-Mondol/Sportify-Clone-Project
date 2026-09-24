import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, forward API and upload requests to the backend so no CORS setup is needed.
const backend = process.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/uploads': backend,
    },
  },
});
