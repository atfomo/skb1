import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    host: 'dev.atfomo.local', // Your specified development host
    port: 3000,
  },
  plugins: [react()],
  build: {

    minify: 'terser', // Explicitly specify 'terser' if you want to use its options


    terserOptions: {
      compress: {
        drop_console: true, // This is the key: removes console.* calls
        drop_debugger: true, // Also removes debugger statements
      },





    },


  },
});