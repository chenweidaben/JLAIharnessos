/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * E2E：患者360视图
 */
import { test, expect, loginAsAdmin } from './helpers';

test.describe('患者360视图', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('患者列表加载', async ({ page }) => {
    await page.goto('/patients');
    await expect(page.locator('.ant-table, .ant-list, [class*="patient"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('患者搜索', async ({ page }) => {
    await page.goto('/patients');
    const search = page.locator('input[placeholder*="搜索"], input[placeholder*="姓名"], .ant-input-search input').first();
    if (await search.isVisible()) {
      await search.fill('张');
      await search.press('Enter');
    }
  });

  test('进入患者详情', async ({ page }) => {
    await page.goto('/patients');
    const firstRow = page.locator('.ant-table-row, [class*="patient-item"], tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/patients\//, { timeout: 5_000 });
    }
  });

  test('Tab 切换', async ({ page }) => {
    await page.goto('/patients');
    const firstRow = page.locator('.ant-table-row, tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      const tabs = page.locator('.ant-tabs-tab').first();
      if (await tabs.isVisible()) {
        await tabs.click();
      }
    }
  });
});
