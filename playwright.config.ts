import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  globalSetup: "tests/e2e-setup.ts",
  use: {
    baseURL: "http://localhost:5174",
    browserName: "chromium",
    headless: true,
  },
  reporter: "list",
  webServer: [
    {
      command: "node scripts/start-test-api.mjs",
      url: "http://127.0.0.1:4001/api/v1/health",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: "npm run dev -w @algolearn/web -- --port 5174",
      env: { API_TARGET: "http://127.0.0.1:4001" },
      url: "http://localhost:5174",
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
