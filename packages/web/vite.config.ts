import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Allow Replit to access the dev server
    host: '0.0.0.0',
    port: 5174,
    hmr: {
      // Use websocket for HMR in Replit
      port: 5174,
    },
    cors: {
      origin: true, // Allow all origins in development
      credentials: true,
    },
    // Allow all Replit hosts
    allowedHosts: ['.replit.dev', '.replit.app', '.repl.co', 'localhost'],
  },
  preview: {
    // Production preview server settings for Replit
    host: '0.0.0.0',
    port: 3000,
    cors: {
      origin: true, // Allow all origins for preview
      credentials: true,
    },
    // Allow all Replit hosts
    allowedHosts: ['.replit.dev', '.replit.app', '.repl.co', 'localhost'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'SpecifAI',
        short_name: 'SpecifAI',
        description: 'Voice-to-GitHub-Issue - Autonomously processed',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
