/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * E2E：急诊分诊
 */
import { test, expect, loginAsAdmin } from './helpers';

test.describe('急诊分诊', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('分诊台加载', async ({ page }) => {
    await page.goto('/emergency');
    await expect(page.locator('[class*="triage"], text=分诊, .ant-table').first()).toBeVisible({ timeout: 10_000 });
  });

  test('四级分诊筛选可见', async ({ page }) => {
    await page.goto('/emergency');
    await expect(page.locator('text=Ⅰ级, text=Ⅱ级, text=Ⅲ级, text=Ⅳ级, .ant-tag').first()).toBeVisible({ timeout: 5_000 });
  });

  test('绿色通道入口', async ({ page }) => {
    await page.goto('/emergency');
    const gcBtn = page.getByText('绿色通道').first();
    await expect(gcBtn).toBeVisible({ timeout: 5_000 });
  });

  test('抢救室查看', async ({ page }) => {
    await page.goto('/emergency');
    await expect(page.locator('text=抢救室, text=留观').first()).toBeVisible({ timeout: 5_000 });
  });
});
