import { defineConfig } from "tsup";

// Dual-format library build (ESM + CJS + .d.ts). No framework deps — design-kit
// is a framework-agnostic browser logic library; nothing is marked external.
// CDN (esm.sh) serves the dist ESM that Claude Design prototypes import.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  minify: false,
});
