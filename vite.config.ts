import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { ratesMiddleware } from "./server/rates.ts";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "elsewhere-rates",
      configureServer(server) {
        server.middlewares.use(ratesMiddleware);
      },
      configurePreviewServer(server) {
        server.middlewares.use(ratesMiddleware);
      },
    },
  ],
  test: {
    include: ["src/**/*.test.ts", "server/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
  },
});
