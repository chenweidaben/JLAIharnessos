/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 医疗质量指标 medical_quality_indicators
 */

import { describe, it, expect } from 'bun:test';
import { medicalQualityIndicatorsTool } from '@medical/operations/medicalQualityIndicators';
import { createMedicalToolContext } from './helpers';

describe('medical_quality_indicators', () => {
  it('全院2026-09返回质量指标并标注预警', async () => {
    const ctx = createMedicalToolContext();
    const result = await medicalQualityIndicatorsTool.execute(
      { department: undefined, startDate: '2026-09', endDate: '2026-09' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['total'] as number).toBeGreaterThan(0);
    // 全院含"抗菌药物使用强度"为预警项
    expect(data['warningCount'] as number).toBeGreaterThanOrEqual(1);
    const list = data['indicators'] as Array<Record<string, unknown>>;
    expect(list.every((i) => i['status'] === '达标' || i['status'] === '预警')).toBe(true);
  });

  it('按科室与类别过滤生效（含全院基线）', async () => {
    const ctx = createMedicalToolContext();
    const result = await medicalQualityIndicatorsTool.execute(
      {
        department: '呼吸内科',
        indicatorType: '合理用药',
        startDate: '2026-09',
        endDate: '2026-09',
      },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    const list = data['indicators'] as Array<Record<string, unknown>>;
    // 科室过滤会同时纳入全院基线（department=null）：全院合理用药2条 + 呼吸内科1条
    expect(list.length).toBe(3);
    // 全部为合理用药类别
    expect(list.every((i) => i['indicatorType'] === '合理用药')).toBe(true);
    // 呼吸内科专属指标存在
    expect(
      list.some((i) => i['indicatorName'] === '门诊抗菌药物处方率'),
    ).toBe(true);
  });

  it('空时间区间返回空指标集', async () => {
    const ctx = createMedicalToolContext();
    const result = await medicalQualityIndicatorsTool.execute(
      { startDate: '2025-01', endDate: '2025-02' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['total']).toBe(0);
    expect(data['warningCount']).toBe(0);
  });
});
