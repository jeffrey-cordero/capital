import { reactRouter } from "@react-router/dev/vite";
import autoprefixer from "autoprefixer";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
   resolve: {
      alias: {
         "@": "/app"
      }
   },
   css: {
      postcss: {
         plugins: [autoprefixer]
      }
   },
   server: {
      host: true,
      port: 3000
   },
   plugins: [reactRouter(), tsconfigPaths()],
   define: {
      _global: ({})
   },
   optimizeDeps: {
      exclude: ["chunk-HR3LP2OW"]
   },
   ssr: {
   noExternal:
      process.env.NODE_ENV === 'production'
         ? [
            '@mui/system',
            '@mui/material',
            '@mui/x-internals',
            '@mui/x-charts',
            '@mui/utils',
            '@mui/x-data-grid',
            '@mui/styled-engine'
         ] : []
   }
});