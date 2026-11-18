import { build } from "vite";
await build({
  configFile: false,
  build: {
    target: "es2022",
    emptyOutDir: false,
    outDir: "dist",
    lib: {
      entry: "src/content/index.ts",
      name: "CardGuardDetector",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
