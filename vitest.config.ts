import { defineConfig } from "vitest/config";

// jsdom so the library has a real `window` to patch `window.fetch` on. The
// default origin is an agentaily subdomain so relative `/api/*` URLs resolve to
// a production-shaped absolute URL (matches how a real prototype is served).
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: { url: "https://form-design.agentaily.com/" },
    },
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
