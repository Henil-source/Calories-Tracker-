import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" so the same build loads from file:// (Electron) and the Android WebView.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false, chunkSizeWarningLimit: 900 },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
} as any);
