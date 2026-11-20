import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@standalone-host": fileURLToPath(new URL("./src/hosts/web.ts", import.meta.url)) } },
  test: { environment: "jsdom", include: ["apps/standalone/tests/**/*.test.{ts,tsx}"] },
});
