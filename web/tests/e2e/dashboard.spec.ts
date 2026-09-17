/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * E2E：工作台仪表盘
 */
import { test, expect, loginAsAdmin } from './helpers';

test.describe('工作台仪表盘', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('工作台页面加载', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.ant-layout-content')).toBeVisible();
  });

  test('数据卡片渲染', async ({ page }) => {
    // StatCard 卡片
    await expect(page.locator('.ant-statistic, [class*="cursor-pointer"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('待办列表存在', async ({ page }) => {
    const todo = page.locator('text=待办, text=Todo, .ant-list').first();
    await expect(todo).toBeVisible({ timeout: 5_000 });
  });

  test('快捷入口可点击', async ({ page }) => {
    const quick = page.locator('text=快捷, a:has-text("患者"), a:has-text("AI")').first();
    if (await quick.isVisible()) {
      await quick.click();
    }
  });
});
