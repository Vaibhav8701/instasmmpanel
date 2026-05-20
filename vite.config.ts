import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { mountPaymentApi } from "./server/payment-api.mjs";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    {
      name: "payment-api",
      configureServer(server) {
        mountPaymentApi(server.middlewares);
      },
    },
  ],
  build: {
    outDir: "dist/client",
  },
});
