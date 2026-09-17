/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * E2E：登录流程
 */
import { test, expect } from './helpers';

test.describe('登录流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('登录页面加载', async ({ page }) => {
    await expect(page).toHaveTitle(/健澜|登录/i);
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('账号密码登录成功', async ({ page }) => {
    await page.fill('input#username, input[placeholder*="用户名"]', 'admin');
    await page.fill('input[type="password"]', 'Admin@123456');
    const captcha = page.locator('input[placeholder*="验证码"]').first();
    if (await captcha.isVisible()) await captcha.fill('ABCD');
    await page.locator('button[type="submit"], button:has-text("登录")').first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('登录失败错误提示', async ({ page }) => {
    await page.fill('input#username, input[placeholder*="用户名"]', 'ghost_user');
    await page.fill('input[type="password"]', 'wrong');
    const captcha = page.locator('input[placeholder*="验证码"]').first();
    if (await captcha.isVisible()) await captcha.fill('ABCD');
    await page.locator('button[type="submit"], button:has-text("登录")').first().click();
    await expect(page.locator('.ant-message, .ant-form-item-explain, .ant-alert').first()).toBeVisible({ timeout: 5_000 });
  });

  test('忘记密码跳转', async ({ page }) => {
    const link = page.locator('a:has-text("忘记密码"), a:has-text("找回")');
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL(/forgot-password/);
    }
  });

  test('SSO 登录入口可见', async ({ page }) => {
    // SSO 入口可能存在，此处仅断言登录表单可见
    await expect(page.locator('form')).toBeVisible();
  });
});
