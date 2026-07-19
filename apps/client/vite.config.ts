import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {VitePWA} from "vite-plugin-pwa";

export default defineConfig({
  plugins: [react(), tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        injectionPoint: "self.__WB_MANIFEST",
      },
      devOptions: {
        enabled: true,
        type: "module"
      },
      manifest: {
        name: "Digest",
        short_name: "Digest",
        description: "Your Gmail inbox, summarized every day.",
        theme_color: "#2b978c",
        background_color: "#f7f7f6",
        display: "standalone",
        start_url: "/digest/today",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    })
  ],
});
