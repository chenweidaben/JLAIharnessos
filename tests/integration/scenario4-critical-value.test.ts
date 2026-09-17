/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 端到端医疗场景测试 - 场景4：危急值处理全流程
 * 检验返回 → 危急值识别 → 警报推送 → 分级 → 处置建议 → 通知记录
 */

import { describe, it, expect } from 'bun:test';
import { emptyCtx } from '../unit/medical-tools/helpers.js';
import { criticalValueAlertTool } from '@/medical-tools/cds/criticalValueAlert.js';

describe('E2E场景4：危急值处理全流程', () => {
  it('步骤1-2：高钾血症（血钾6.9）应识别为危急并给出处置', async () => {
    const res = await criticalValueAlertTool.execute(
      { patientId: 'P2026090004', labResults: [{ testName: '血钾', value: 6.9, unit: 'mmol/L', refLow: 3.5, refHigh: 5.5 }] },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const d = res.data as {
      hasCritical: boolean;
      criticalValues: { testName: string; level: string; suggestedAction: string[] }[];
    };
    expect(d.hasCritical).toBe(true);
    expect(d.criticalValues[0].level).toBe('危急');
    expect(d.criticalValues[0].suggestedAction.length).toBeGreaterThan(0);
  });

  it('低血糖（血糖2.1）应识别为危急', async () => {
    const res = await criticalValueAlertTool.execute(
      { patientId: 'P001', labResults: [{ testName: '血糖', value: 2.1, unit: 'mmol/L', refLow: 3.9 }] },
      emptyCtx,
    );
    const d = res.data as { hasCritical: boolean };
    expect(d.hasCritical).toBe(true);
  });

  it('肌钙蛋白显著升高（4.8）应识别为危急', async () => {
    const res = await criticalValueAlertTool.execute(
      { patientId: 'P001', labResults: [{ testName: '肌钙蛋白', value: 4.8, unit: 'ng/mL' }] },
      emptyCtx,
    );
    const d = res.data as { hasCritical: boolean };
    expect(d.hasCritical).toBe(true);
  });

  it('步骤3-4：正常检验值不应触发危急警报', async () => {
    const res = await criticalValueAlertTool.execute(
      { patientId: 'P001', labResults: [{ testName: '血钾', value: 4.2, unit: 'mmol/L' }] },
      emptyCtx,
    );
    const d = res.data as { hasCritical: boolean; criticalValues: unknown[] };
    expect(d.hasCritical).toBe(false);
    expect(d.criticalValues.length).toBe(0);
  });

  it('步骤5：危急值应产生通知记录并附免责声明', async () => {
    const res = await criticalValueAlertTool.execute(
      { patientId: 'P2026090001', labResults: [{ testName: '肌钙蛋白I', value: 6.0, unit: 'ng/mL' }] },
      emptyCtx,
    );
    const d = res.data as { notificationRecord: unknown[]; disclaimer: string };
    expect(d.notificationRecord.length).toBe(1);
    expect(d.disclaimer).toContain('仅供参考');
  });
});
