import { expect, test } from '@playwright/test';

test('full workflow surfaces render and job flow is operable', async ({
  page,
  request,
}, testInfo) => {
  const shot = async (name: string) => {
    await page.screenshot({
      path: testInfo.outputPath(`${name}.png`),
      fullPage: true,
    });
  };

  const jobTitle = `E2E workflow ${Date.now()}`;
  const workspacePath = `./local-workspaces/e2e-${Date.now()}`;

  const healthResp = await request.get('http://127.0.0.1:5080/healthz');
  expect(healthResp.ok()).toBeTruthy();

  const createResp = await request.post('http://127.0.0.1:5080/api/v1/jobs', {
    data: {
      title: jobTitle,
      description: 'E2E full workflow validation with screenshots.',
      workflow_id: 'planning',
      provider_id: 'claude-code',
      workspace_path: workspacePath,
    },
  });
  if (!createResp.ok()) {
    const body = await createResp.text();
    throw new Error(`Create job failed (${createResp.status()}): ${body}`);
  }

  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  await expect(page.getByText(jobTitle).first()).toBeVisible({ timeout: 30_000 });
  await shot('01-jobs-list');

  await page
    .getByRole('link', { name: new RegExp(jobTitle) })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: jobTitle })).toBeVisible();
  await shot('02-job-detail-overview');

  await page.getByRole('button', { name: /stages & tasks/i }).click();
  await expect(page.getByText(/planning|execution/i).first()).toBeVisible();
  await shot('03-job-detail-stages');

  await page.getByRole('button', { name: /timeline/i }).click();
  await expect(page.getByText(/timeline|event|no events/i).first()).toBeVisible();
  await shot('04-job-detail-timeline');

  await page.getByRole('button', { name: /logs/i }).click();
  await expect(page.locator('pre, .font-mono').first()).toBeVisible();
  await shot('05-job-detail-logs');

  await page.goto('/workflows');
  await expect(page.getByRole('heading', { name: 'Workflows' })).toBeVisible();
  await shot('06-workflows');

  await page.goto('/agents');
  await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible();
  await shot('07-agents');

  await page.goto('/artifacts');
  await expect(page.getByRole('heading', { name: 'Artifacts' })).toBeVisible();
  await shot('08-artifacts');

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await shot('09-settings');
});
