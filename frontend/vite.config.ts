import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      "/scales": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
