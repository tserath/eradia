// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Simplified babel config
      babel: {
        babelrc: false,
        configFile: false
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['robots.txt', 'pwa-192x192.png', 'pwa-512x512.png', 'manifest.json'],
      manifest: false, // Use the static manifest.json instead
      devOptions: {
        enabled: true
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        navigateFallback: 'index.html'
      }
    })
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ]
    }
  },
  build: {
    sourcemap: true,
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 3000,
    host: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-day-picker',
      'date-fns',
      '@tiptap/react',
      '@tiptap/pm',
      '@tiptap/starter-kit'
    ]
  }
});