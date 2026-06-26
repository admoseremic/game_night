import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Game Night', short_name: 'GameNight',
        description: 'Game night leaderboards, records & history',
        start_url: '/', display: 'standalone', orientation: 'portrait',
        background_color: '#130E1B', theme_color: '#130E1B',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ],
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
