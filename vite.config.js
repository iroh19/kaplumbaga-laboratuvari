import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" sayesinde site hem Vercel/Netlify'da hem de GitHub Pages'in alt klasöründe çalışır
export default defineConfig({
  plugins: [react()],
  base: "./",
});
