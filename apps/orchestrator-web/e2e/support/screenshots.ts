import type { Page, TestInfo } from '@playwright/test';

export async function captureDashboardScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.setViewportSize({ width: 1680, height: 1600 });

  await page.evaluate(() => {
    document.documentElement.style.height = 'auto';
    document.documentElement.style.overflow = 'visible';
    document.body.style.height = 'auto';
    document.body.style.overflow = 'visible';

    const root = document.querySelector<HTMLElement>('[data-testid="dashboard-root"]');
    const shell = document.querySelector<HTMLElement>('[data-testid="dashboard-shell"]');
    const main = document.getElementById('app-main');

    if (root) {
      root.style.height = 'auto';
      root.style.minHeight = 'auto';
      root.style.overflow = 'visible';
    }

    if (shell) {
      shell.style.height = 'auto';
      shell.style.minHeight = 'auto';
      shell.style.overflow = 'visible';
    }

    if (main) {
      main.style.height = 'auto';
      main.style.minHeight = 'auto';
      main.style.maxHeight = 'none';
      main.style.overflow = 'visible';
    }
  });

  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
  });
}
