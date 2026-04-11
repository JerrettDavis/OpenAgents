import { expect, test } from '@playwright/test';

type ProviderItem = {
  id: string;
  provider_id: string;
  is_enabled: boolean;
};

type WorkflowItem = {
  id: string;
  slug: string;
  is_enabled: boolean;
};

test('runtime toggles refresh shell counts and filter create-job options', async ({
  page,
  request,
}) => {
  const providersResp = await request.get(
    'http://127.0.0.1:5080/api/v1/providers?include_disabled=true'
  );
  const workflowsResp = await request.get(
    'http://127.0.0.1:5080/api/v1/workflows?include_disabled=true'
  );

  expect(providersResp.ok()).toBeTruthy();
  expect(workflowsResp.ok()).toBeTruthy();

  const providersBody = (await providersResp.json()) as { items?: ProviderItem[] } | ProviderItem[];
  const workflowsBody = (await workflowsResp.json()) as { items: WorkflowItem[] };

  const providers = Array.isArray(providersBody) ? providersBody : (providersBody.items ?? []);
  const workflows = workflowsBody.items ?? [];

  const provider = providers.find((item) => item.is_enabled && item.provider_id !== 'claude-code');
  const workflow = workflows.find((item) => item.is_enabled && item.slug !== 'planning');

  expect(provider).toBeTruthy();

  const initialProviderCount = providers.filter((item) => item.is_enabled).length;
  const initialWorkflowCount = workflows.filter((item) => item.is_enabled).length;

  const settingsRow = page.locator('tr', { hasText: provider!.provider_id });
  const workflowsRow = workflow ? page.locator('tr', { hasText: workflow.slug }) : null;
  let providerDisabled = false;
  let workflowDisabled = false;

  try {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByTestId('topbar-providers')).toContainText(String(initialProviderCount));
    await expect(page.getByTestId('sidebar-providers-count')).toHaveText(
      String(initialProviderCount)
    );
    await settingsRow.getByRole('button', { name: 'Disable' }).click();
    providerDisabled = true;
    await expect(page.getByTestId('topbar-providers')).toContainText(
      String(initialProviderCount - 1)
    );
    await expect(page.getByTestId('sidebar-providers-count')).toHaveText(
      String(initialProviderCount - 1)
    );

    if (workflow && workflowsRow) {
      await page.goto('/workflows');
      await expect(page.getByRole('heading', { name: 'Workflows' })).toBeVisible();
      await expect(page.getByTestId('topbar-workflows')).toContainText(
        String(initialWorkflowCount)
      );
      await expect(page.getByTestId('sidebar-workflows-count')).toHaveText(
        String(initialWorkflowCount)
      );
      await workflowsRow.getByRole('button', { name: 'Disable' }).click();
      workflowDisabled = true;
      await expect(page.getByTestId('topbar-workflows')).toContainText(
        String(initialWorkflowCount - 1)
      );
      await expect(page.getByTestId('sidebar-workflows-count')).toHaveText(
        String(initialWorkflowCount - 1)
      );
    }

    await page.goto('/jobs');
    await page.getByRole('button', { name: /new job/i }).click();
    await expect(page.getByRole('dialog', { name: 'New Job' })).toBeVisible();

    const workflowOptions = page.locator('select').first().locator('option');
    const providerOptions = page.locator('select').nth(1).locator('option');

    await expect(workflowOptions).toHaveCount(
      initialWorkflowCount - (workflowDisabled ? 1 : 0) + 1
    );
    await expect(providerOptions).toHaveCount(initialProviderCount);

    if (workflow) {
      await expect(workflowOptions.filter({ hasText: workflow.slug })).toHaveCount(
        workflowDisabled ? 0 : 1
      );
    }
    await expect(providerOptions.filter({ hasText: provider!.provider_id })).toHaveCount(0);

    await page.getByRole('button', { name: 'Close' }).click();
  } finally {
    if (providerDisabled) {
      const restoreProviderResp = await request.put(
        `http://127.0.0.1:5080/api/v1/providers/${provider!.provider_id}`,
        {
          data: { is_enabled: true },
        }
      );
      expect(restoreProviderResp.ok()).toBeTruthy();
    }

    if (workflowDisabled && workflow) {
      const restoreWorkflowResp = await request.put(
        `http://127.0.0.1:5080/api/v1/workflows/${workflow.slug}`,
        {
          data: { is_enabled: true },
        }
      );
      expect(restoreWorkflowResp.ok()).toBeTruthy();
    }
  }
});
