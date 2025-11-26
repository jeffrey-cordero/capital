import dotenv from "dotenv";

dotenv.config();

import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.VITE_SERVER_PORT || 3000;

const webServer = {
   command: "npm run dev",
   url: `http://localhost:${PORT}`,
   timeout: 240 * 1000,
   reuseExistingServer: !process.env.CI
};

export default defineConfig({
   testDir: "tests/",
   fullyParallel: true,
   forbidOnly: !!process.env.CI,
   retries: process.env.CI ? 3 : 0,
   workers: process.env.CI ? 3 : undefined,
   reporter: "html",
   timeout: 120000, // 120 seconds per test
   use: {
      baseURL: webServer.url,
      trace: "on-first-retry",
      actionTimeout: 30000, // 30 seconds for actions like click, fill, etc.
      navigationTimeout: 30000 // 30 seconds for page navigation
   },
   projects: [
      {
         name: "chromium",
         use: { ...devices["Desktop Chrome"] }
      }
   ],
   webServer
});