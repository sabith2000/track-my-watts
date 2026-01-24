// meter-tracker/client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read version from package.json
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

export default defineConfig({
  plugins: [
    react(),
    // --- PWA CONFIGURATION ---
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Track My Watts',
        short_name: 'TrackMyWatts',
        description: 'Track your electricity consumption and manage billing cycles.',
        
        // --- UPDATED: Dark Navy Brand Colors ---
        theme_color: '#0f172a',      // Matches the Header
        background_color: '#0f172a', // Matches the Splash Screen
        
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable' // Ensures full-bleed icon on Android
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // --- FIX: Increase Cache Limit for Large Libraries ---
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
  },

  build: {
    chunkSizeWarningLimit: 3000,
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001', 
        changeOrigin: true, 
      },
    },
  },
});