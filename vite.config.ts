import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // SW met a jour silencieusement quand on deploie une nouvelle version
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "One More Pull",
        short_name: "One More Pull",
        description: "Une machine a sous narrative noir & blanc.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#141414",
        orientation: "portrait",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // precache tout l'app (HTML/JS/CSS/PNG/WAV) pour fonctionner offline
        globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,svg,ico,webp,wav,mp3}"],
        // les nouvelles versions remplacent l'ancien SW immediatement
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // gros assets autorises (level_X.png ~5MB, machine ~3MB)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      includeAssets: [
        "favicon.ico",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
        "icon-512-maskable.png",
      ],
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
