/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * E2E：门诊问诊
 */
import { test, expect, loginAsAdmin } from './helpers';

test.describe('门诊问诊', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('候诊队列加载', async ({ page }) => {
    await page.goto('/outpatient');
    // 左侧候诊队列卡片标题（WaitingQueue Card）
    await expect(page.getByText('候诊队列').first()).toBeVisible({ timeout: 10_000 });
  });

  test('叫号功能', async ({ page }) => {
    await page.goto('/outpatient');
    const callBtn = page.getByText('呼叫下一位');
    if (await callBtn.isVisible()) {
      await callBtn.click();
    }
  });

  test('诊断面板可见', async ({ page }) => {
    await page.goto('/outpatient');
    await expect(page.getByText('候诊队列').first()).toBeVisible({ timeout: 10_000 });
    // 呼叫下一位患者，进入问诊工作台（中间区出现 诊断/处方 Tab）
    const callNext = page.locator('button:has-text("呼叫下一位")').first();
    if (await callNext.isVisible()) {
      await callNext.click();
    }
    await expect(page.locator('.ant-tabs-tab').first()).toBeVisible({ timeout: 8_000 });
  });
});
