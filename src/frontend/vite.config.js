import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target:
          "https://institutions-team-067-future-pms-production-14dd.up.railway.app",
        changeOrigin: true,
      },
    },
  },
});
