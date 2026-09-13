import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  { name: 'home', path: '/sv' },
  { name: 'products', path: '/sv/produkter' },
  { name: 'not-found', path: '/sv/produkter/quality-gate-does-not-exist' },
];

for (const route of routes) {
  test(`${route.name} has no serious or critical automated accessibility violations`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter((violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
    );

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}
