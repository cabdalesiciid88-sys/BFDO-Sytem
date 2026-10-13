import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// Runs against a dev server pointed at the dedicated test database (see
// .env.test), never the manually-curated dev database — e2e/seed.ts
// (globalSetup) seeds the two accounts the specs sign in as.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./e2e/seed.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  // Turbopack dev mode compiles each route on its first hit — several
  // seconds per route, observed directly during this project's manual
  // browser testing (docs/project-status.md) — well past Playwright's 5s
  // default. Generous here on purpose; this suite isn't measuring speed.
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    navigationTimeout: 20_000,
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx next dev --port 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: "mysql://bfdo_app:bfdo_dev_app_pw@localhost:3307/bfdo_management_test",
      STORAGE_ROOT: path.resolve(__dirname, ".local-storage-test"),
      AUTH_SECRET: "test-only-secret-not-for-production-0123456789abcdef",
      MAX_UPLOAD_BYTES: "26214400",
      NODE_ENV: "development",
    },
  },
});
