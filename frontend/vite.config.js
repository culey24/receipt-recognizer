import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Pre-bundle tesseract.js so CommonJS `require` is transformed for the browser.
  // Excluding it caused: "require is not defined" at runtime.
  optimizeDeps: {
    include: ["tesseract.js"],
  },
});
