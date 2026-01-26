import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { version } from "./package.json";

export default defineConfig({
  root: "client",
  define: {
    '__APP_VERSION__': JSON.stringify(version)
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: false
  }
});
