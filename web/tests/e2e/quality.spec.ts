/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * E2E：质控管理
 */
import { test, expect, loginAsAdmin } from './helpers';

test.describe('质控管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('质控工作台加载', async ({ page }) => {
    await page.goto('/quality');
    await expect(page.locator('[class*="quality"], text=质控, .ant-table').first()).toBeVisible({ timeout: 10_000 });
  });

  test('质控任务列表', async ({ page }) => {
    await page.goto('/quality');
    await expect(page.locator('.ant-table, .ant-list, text=待评').first()).toBeVisible({ timeout: 5_000 });
  });

  test('进入病历批阅', async ({ page }) => {
    await page.goto('/quality');
    const firstRow = page.locator('.ant-table-row, tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/quality\//, { timeout: 5_000 });
    }
  });

  test('规则配置页', async ({ page }) => {
    await page.goto('/quality/rules');
    await expect(page.locator('text=规则, text=质控规则, .ant-switch').first()).toBeVisible({ timeout: 5_000 });
  });
});
