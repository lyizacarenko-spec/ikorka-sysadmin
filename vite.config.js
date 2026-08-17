import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Repo name must match the GitHub repo — GitHub Pages serves this
// project from https://<user>.github.io/ikorka-sysadmin/, so every
// asset URL needs that prefix.
export default defineConfig({
  plugins: [react()],
  base: "/ikorka-sysadmin/",
});
