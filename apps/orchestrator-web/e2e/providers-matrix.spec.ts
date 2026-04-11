import { expect, test } from '@playwright/test';

const requiredProviders = [
  { id: 'claude-code', name: 'Claude Code' },
  { id: 'opencode', name: 'OpenCode' },
  { id: 'codex', name: 'Codex' },
  { id: 'gemini', name: 'Gemini' },
  { id: 'copilot', name: 'Copilot' },
];

test('required providers are available across API and dashboard surfaces', async ({
  page,
  request,
}) => {
  const providersResp = await request.get('http://127.0.0.1:5080/api/v1/providers');
  expect(providersResp.ok()).toBeTruthy();
  const providers = (await providersResp.json()) as Array<{
    provider_id: string;
    name: string;
  }>;

  expect(providers.map((provider) => provider.provider_id).sort()).toEqual(
    requiredProviders.map((provider) => provider.id).sort()
  );

  const workflowsResp = await request.get('http://127.0.0.1:5080/api/v1/workflows');
  expect(workflowsResp.ok()).toBeTruthy();
  const workflowsBody = (await workflowsResp.json()) as {
    items?: Array<{
      slug: string;
      provider_compatibility: Array<{ provider_id: string }>;
    }>;
  };
  const planningWorkflow = workflowsBody.items?.find((workflow) => workflow.slug === 'planning');
  expect(planningWorkflow).toBeTruthy();
  expect(
    planningWorkflow!.provider_compatibility.map((provider) => provider.provider_id).sort()
  ).toEqual(requiredProviders.map((provider) => provider.id).sort());

  const titles: string[] = [];
  for (const provider of requiredProviders) {
    const title = `Provider matrix ${provider.id} ${Date.now()}`;
    titles.push(title);

    const createResp = await request.post('http://127.0.0.1:5080/api/v1/jobs', {
      data: {
        title,
        description: `E2E validation for ${provider.name}`,
        workflow_id: 'planning',
        provider_id: provider.id,
        workspace_path: `./local-workspaces/${provider.id}-${Date.now()}`,
      },
    });

    if (!createResp.ok()) {
      throw new Error(
        `Create job failed for ${provider.id} (${createResp.status()}): ${await createResp.text()}`
      );
    }
  }

  await page.goto('/agents');
  await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible();
  const providersLoadedCard = page.getByTestId('agents-stat-providers-loaded');
  await expect(
    providersLoadedCard.getByText(String(requiredProviders.length), { exact: true })
  ).toBeVisible();
  for (const provider of requiredProviders) {
    await expect(page.getByText(provider.name, { exact: true })).toBeVisible();
  }

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  for (const provider of requiredProviders) {
    await expect(page.getByRole('cell', { name: provider.id, exact: true })).toBeVisible();
  }

  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  for (const title of titles) {
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });
  }
});
