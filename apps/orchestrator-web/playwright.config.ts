import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  timeout: 120_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:3080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command:
        'dotnet run --project apps/orchestrator-api/OpenAgents.OrchestratorApi.csproj --urls http://127.0.0.1:5080',
      cwd: repoRoot,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__OpenAgents:
          'Data Source=C:\\git\\OpenAgents\\apps\\orchestrator-api\\openagents-playwright.db',
        OpenAgents__Api__CorsOrigins__0: 'http://127.0.0.1:3080',
        OpenAgents__Api__CorsOrigins__1: 'http://localhost:3080',
      },
      url: 'http://127.0.0.1:5080/healthz',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'pnpm build && pnpm start --port 3080',
      cwd: __dirname,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:5080',
      },
      url: 'http://127.0.0.1:3080/jobs',
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
});
