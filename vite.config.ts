import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Writes dist/version.json at build time so the running app can detect
// when a new deploy is available and auto-reload stale tabs.
function versionJsonPlugin(): Plugin {
  return {
    name: "version-json",
    apply: "build",
    closeBundle() {
      try {
        const outDir = path.resolve(__dirname, "dist");
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const version = String(Date.now());
        fs.writeFileSync(
          path.join(outDir, "version.json"),
          JSON.stringify({ version, builtAt: new Date().toISOString() }) + "\n",
          "utf8"
        );
      } catch (err) {
        // Non-fatal: version check will just be a no-op if the file is missing.
        console.warn("[version-json] failed to write version.json:", err);
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    versionJsonPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
