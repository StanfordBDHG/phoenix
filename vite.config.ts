import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  base: '/phoenix',
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'ckeditor': ['@helsenorge/ckeditor5-build-markdown'],
          'drag-drop': ['react-beautiful-dnd', '@stanfordbdhg/react-sortable-tree'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'utils': ['immer', 'date-fns', 'crypto-js', 'axios'],
          'i18n': ['react-i18next', 'i18next']
        }
      }
    },
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
}); 