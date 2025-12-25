// meter-tracker/client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // Import the PWA plugin
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read version from package.json
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // --- PWA CONFIGURATION ---
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the app when you push new code
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Track My Watts',
        short_name: 'WattsTracker',
        description: 'Track your electricity consumption and manage billing cycles.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Makes it look like a native app (no browser bar)
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
    // -------------------------
  ],
  
  // Define global constants
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
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