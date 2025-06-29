import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    host: 'dev.atfomo.local', // Change this
    port: 3000,
  },
  // ...
});