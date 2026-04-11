import { expect, test } from '@playwright/test';

test('provider and workflow definitions can be created from the dashboard', async ({ page }) => {
  const stamp = Date.now();
  const providerId = `ui-provider-${stamp}`;
  const workflowSlug = `ui-workflow-${stamp}`;

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: /\+ new provider/i }).click();
  await page.getByRole('textbox', { name: 'Provider ID *' }).fill(providerId);
  await page.getByRole('textbox', { name: 'Display name *' }).fill(`UI Provider ${stamp}`);
  await page.getByRole('textbox', { name: 'Version *' }).fill('1.0.0');
  await page
    .getByRole('textbox', { name: 'Docker image *' })
    .fill(`ghcr.io/openagents/${providerId}:latest`);
  await page.getByRole('button', { name: 'Create Provider' }).click();
  await expect(page.getByRole('cell', { name: providerId, exact: true })).toBeVisible();
  await expect(page.getByText('disabled').last()).toBeVisible();

  await page.goto('/workflows');
  await expect(page.getByRole('heading', { name: 'Workflows' })).toBeVisible();
  await page.getByRole('button', { name: /\+ new workflow/i }).click();
  await page.getByRole('textbox', { name: 'Name *' }).fill(`UI Workflow ${stamp}`);
  await page.getByRole('textbox', { name: 'Slug *' }).fill(workflowSlug);
  await page.getByRole('textbox', { name: 'Version *' }).fill('1.0.0');
  await page.getByRole('textbox', { name: 'Category' }).fill('testing');
  await page.getByRole('button', { name: 'Create Workflow' }).click();
  await expect(page.getByRole('cell', { name: workflowSlug, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable' }).last()).toBeVisible();
});
