import { defineConfig, devices } from "@playwright/test";
import { readStack } from "./tests/e2e/harness/stack";
import { NOW } from "./tests/e2e/harness/fixtures";

// Cada worker recarrega esta config: o status da Supabase roda uma vez so.
process.env.E2E_STACK ??= JSON.stringify(readStack());
const stack = JSON.parse(process.env.E2E_STACK);

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  snapshotPathTemplate: "{testDir}/__screens__/{arg}{ext}",
  globalSetup: "./tests/e2e/harness/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  expect: { toHaveScreenshot: { maxDiffPixels: 0 } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    serviceWorkers: "block",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 120_000,
    // Nunca reaproveitar: um dev server solto pode estar no banco de producao.
    reuseExistingServer: false,
    env: {
      NODE_OPTIONS: "--require ./tests/e2e/harness/fixedClock.cjs",
      E2E_NOW: NOW,
      NEXT_PUBLIC_SUPABASE_URL: stack.apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: stack.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: stack.serviceKey,
      DATABASE_URL: stack.dbUrl,
      DIRECT_URL: stack.dbUrl,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "",
      VAPID_PRIVATE_KEY: "",
    },
  },
});
