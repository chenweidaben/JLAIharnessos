/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * E2E 测试公共工具：登录态注入 / 路由跳转
 */
import { test as base, expect, type Page } from '@playwright/test';

/** 自动登录：通过 localStorage 注入会话 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  // 等待登录页加载
  await page.waitForLoadState('networkidle');
  // 演示环境：直接填入 admin / 任意密码 + 验证码
  await page.fill('input[name="username"], input[placeholder*="账号"], input[placeholder*="用户"]', 'admin');
  await page.fill('input[type="password"]', 'Admin@123456');
  // 验证码：演示环境任意 4 位
  const captchaInput = page.locator('input[placeholder*="验证码"], input[placeholder*="captcha"]').first();
  if (await captchaInput.isVisible()) {
    await captchaInput.fill('ABCD');
  }
  const submitBtn = page.locator('button[type="submit"], button:has-text("登录")').first();
  await submitBtn.click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

export const test = base.extend({});
export { expect };
