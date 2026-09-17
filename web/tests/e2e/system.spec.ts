/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * E2E：系统管理
 */
import { test, expect, loginAsAdmin } from './helpers';

test.describe('系统管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('用户管理页加载', async ({ page }) => {
    await page.goto('/system/users');
    await expect(page.locator('.ant-table, text=用户管理').first()).toBeVisible({ timeout: 10_000 });
  });

  test('角色管理页', async ({ page }) => {
    await page.goto('/system/roles');
    await expect(page.locator('.ant-table, text=角色').first()).toBeVisible({ timeout: 5_000 });
  });

  test('权限管理页', async ({ page }) => {
    await page.goto('/system/permissions');
    await expect(page.locator('text=权限, .ant-tree, .ant-table').first()).toBeVisible({ timeout: 5_000 });
  });

  test('操作审计页', async ({ page }) => {
    await page.goto('/system/audit-logs');
    await expect(page.locator('.ant-table, text=审计').first()).toBeVisible({ timeout: 5_000 });
  });

  test('登录日志页', async ({ page }) => {
    await page.goto('/system/login-logs');
    await expect(page.locator('.ant-table, text=登录日志').first()).toBeVisible({ timeout: 5_000 });
  });
});
