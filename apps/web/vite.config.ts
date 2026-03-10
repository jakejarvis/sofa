import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    devtools(),
    tsconfigPaths(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react({
      babel: { plugins: [["babel-plugin-react-compiler"]] },
    }),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    proxy: {
      "/rpc": "http://localhost:3001",
      "/api": "http://localhost:3001",
      "/images": "http://localhost:3001",
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || "0.0.0"),
    __GIT_COMMIT_SHA__: JSON.stringify(
      (process.env.GIT_COMMIT_SHA || "").slice(0, 7),
    ),
  },
});
