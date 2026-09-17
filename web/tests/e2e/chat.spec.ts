/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * E2E：AI 对话
 */
import { test, expect, loginAsAdmin } from './helpers';

test.describe('AI 对话', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('对话页面加载', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('textarea, input[placeholder*="输入"], .ant-input').first()).toBeVisible({ timeout: 10_000 });
  });

  test('发送消息', async ({ page }) => {
    await page.goto('/agent');
    const input = page.locator('textarea, .ant-input textarea, input[placeholder*="输入"]').first();
    await input.fill('患者血糖偏高如何处理？');
    const sendBtn = page.locator('button:has-text("发送"), button[type="submit"], [aria-label*="send" i]').first();
    if (await sendBtn.isVisible()) {
      await sendBtn.click();
    } else {
      await input.press('Enter');
    }
    // 等待 AI 回复出现
    await expect(page.locator('.ant-message, [class*="message"], [class*="chat"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('对话历史列表可见', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('text=对话, text=会话, .ant-menu').first()).toBeVisible({ timeout: 5_000 });
  });
});
