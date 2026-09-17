/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - DRG/DIP分析 drg_dip_analysis
 */

import { describe, it, expect } from 'bun:test';
import { drgDipAnalysisTool } from '@medical/operations/drgDipAnalysis';
import { createMedicalToolContext } from './helpers';

describe('drg_dip_analysis', () => {
  it('按患者查询DRG病例并计算结余', async () => {
    const ctx = createMedicalToolContext();
    const result = await drgDipAnalysisTool.execute(
      { patientId: 'P2026090001' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['totalCases']).toBe(1);
    const cases = data['cases'] as Array<Record<string, unknown>>;
    // P2026090001 为 FM1 高标费用，付费低于成本 → 亏损(surplus<0)
    expect(cases[0]['surplus'] as number).toBeLessThan(0);
    expect(cases[0]['drgGroup']).toBe('FM1');
  });

  it('按科室聚合返回汇总与解读', async () => {
    const ctx = createMedicalToolContext();
    const result = await drgDipAnalysisTool.execute(
      { department: '心血管内科' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['totalCases']).toBe(1);
    expect(data['baseRate']).toBe(9800);
    expect(data['insights']).toBeInstanceOf(Array);
    expect((data['insights'] as string[]).length).toBeGreaterThan(0);
  });

  it('按DRG组码不区分大小写匹配', async () => {
    const ctx = createMedicalToolContext();
    const result = await drgDipAnalysisTool.execute({ drgGroup: 'br1' }, ctx);
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['totalCases']).toBe(1);
    const cases = data['cases'] as Array<Record<string, unknown>>;
    expect(cases[0]['drgGroup']).toBe('BR1');
  });

  it('无匹配病例返回 NO_DATA', async () => {
    const ctx = createMedicalToolContext();
    const result = await drgDipAnalysisTool.execute({ patientId: 'P_NOT_EXIST' }, ctx);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NO_DATA');
  });
});
