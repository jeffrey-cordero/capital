import { reactRouter } from "@react-router/dev/vite";
import autoprefixer from "autoprefixer";
import path from "path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
   resolve: {
      alias: {
         "@": "/app",
         capital: path.resolve(__dirname, "../types")
      }
   },
   css: {
      postcss: {
         plugins: [autoprefixer]
      }
   },
   server: {
      host: true,
      port: parseInt(process.env.VITE_SERVER_PORT || "3000")
   },
   plugins: [reactRouter(), tsconfigPaths()],
   define: {
      _global: ({})
   },
   optimizeDeps: {
      force: true
   },
   build: {
      rollupOptions: {
         preserveSymlinks: true
      }
   },
   ssr: {
      noExternal:
         process.env.NODE_ENV === "production"
            ? [
               "@mui/system",
               "@mui/material",
               "@mui/x-internals",
               "@mui/x-charts",
               "@mui/utils",
               "@mui/x-data-grid",
               "@mui/styled-engine"
            ] : []
   }
});