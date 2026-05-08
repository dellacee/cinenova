import { expect, test } from '@playwright/test';

/**
 * Golden-path smoke test. Run against a live dev stack:
 *   1. pnpm docker:up
 *   2. pnpm db:migrate && pnpm db:seed
 *   3. pnpm dev (in another terminal)
 *   4. pnpm --filter web test:e2e
 */

test('homepage loads and shows the hero', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/CineNova/);
  await expect(page.getByRole('heading', { name: /Where every seat/i })).toBeVisible();
});

test('browse page lists at least one movie', async ({ page }) => {
  await page.goto('/movies?status=NOW_SHOWING');
  await expect(page.locator('h1')).toContainText(/Phim đang chiếu/);
  // We expect at least one card after seed.
  const cards = page.locator('a[href^="/movies/"]');
  await expect(cards.first()).toBeVisible({ timeout: 10_000 });
});

test('signup form validates required fields', async ({ page }) => {
  await page.goto('/auth/signup');
  await page.getByRole('button', { name: /Đăng ký/i }).click();
  // Form lib renders inline errors when the user submits empty.
  await expect(page.locator('text=Bắt buộc').first()).toBeVisible();
});
