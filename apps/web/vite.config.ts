import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/.local/**",
        "**/apps/api/**",
        "**/Syllabus/**",
      ],
    },
    proxy: {
      "/api": {
        target: process.env.API_TARGET ?? "http://127.0.0.1:4000",
        changeOrigin: false,
      },
    },
  },
  build: { chunkSizeWarningLimit: 1000 },
});
