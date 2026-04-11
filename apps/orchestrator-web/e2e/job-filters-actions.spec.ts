import { expect, test } from '@playwright/test';
import { captureDashboardScreenshot } from './support/screenshots';

test('jobs filters and job-detail actions render correctly', async ({
  page,
  request,
}, testInfo) => {
  const shot = async (name: string) => {
    await captureDashboardScreenshot(page, testInfo, name);
  };

  const healthResp = await request.get('http://127.0.0.1:5080/healthz');
  expect(healthResp.ok()).toBeTruthy();

  const title = `E2E filter ${Date.now()}`;
  const createResp = await request.post('http://127.0.0.1:5080/api/v1/jobs', {
    data: {
      title,
      workflow_id: 'planning',
      provider_id: 'claude-code',
      workspace_path: `./local-workspaces/e2e-filter-${Date.now()}`,
    },
  });

  if (!createResp.ok()) {
    throw new Error(`Failed to create job (${createResp.status()}): ${await createResp.text()}`);
  }

  const body = (await createResp.json()) as { job?: { id: string } };
  const jobId = body.job?.id;
  expect(jobId).toBeTruthy();

  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });
  await shot('filters-01-all');

  await page.getByRole('button', { name: 'Pending' }).click();
  await shot('filters-02-pending');

  await page.getByRole('button', { name: 'Running' }).click();
  await shot('filters-03-running');

  await page.getByRole('button', { name: 'All' }).click();
  await page
    .getByRole('link', { name: new RegExp(title) })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  const refreshButton = page.getByRole('button', { name: /↺/i });
  await expect(refreshButton).toBeVisible();

  const startButton = page.getByRole('button', { name: /start/i });
  const stopButton = page.getByRole('button', { name: /stop/i });

  if (await startButton.isVisible()) {
    await startButton.click();
  } else if (await stopButton.isVisible()) {
    await stopButton.click();
  } else {
    await refreshButton.click();
  }

  await expect(
    page.getByText(/Running|Queued|Pending|Error|Completed|Archived/i).first()
  ).toBeVisible();
  await shot('filters-04-detail-actions');

  await page.goto('/jobs');
  await page.getByRole('button', { name: 'All' }).click();
  await shot('filters-05-all-after-action');
});
