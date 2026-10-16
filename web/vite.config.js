import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy API + media to a locally running API (npm start in ../api).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/media': 'http://localhost:3000',
    },
  },
});
