/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 科室运营分析 department_operation_analysis
 */

import { describe, it, expect } from 'bun:test';
import { departmentOperationAnalysisTool } from '@medical/operations/departmentOperationAnalysis';
import { createMedicalToolContext } from './helpers';

describe('department_operation_analysis', () => {
  it('心血管内科2026-08至2026-09返回两月数据与运营解读', async () => {
    const ctx = createMedicalToolContext();
    const result = await departmentOperationAnalysisTool.execute(
      { department: '心血管内科', startDate: '2026-08', endDate: '2026-09' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    const points = data['dataPoints'] as Array<Record<string, unknown>>;
    expect(points.length).toBe(2);
    expect(data['insights']).toBeInstanceOf(Array);
    expect((data['insights'] as string[]).length).toBeGreaterThan(0);
    const summary = data['summary'] as Record<string, unknown>;
    expect(summary['totalOutpatient'] as number).toBeGreaterThan(0);
  });

  it('未知科室/区间返回 NO_DATA', async () => {
    const ctx = createMedicalToolContext();
    const result = await departmentOperationAnalysisTool.execute(
      { department: '不存在科室', startDate: '2026-01', endDate: '2026-03' },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NO_DATA');
  });

  it('返回的收支与毛利率计算正确', async () => {
    const ctx = createMedicalToolContext();
    const result = await departmentOperationAnalysisTool.execute(
      { department: '呼吸内科', startDate: '2026-09', endDate: '2026-09' },
      ctx,
    );
    const data = result.data as Record<string, unknown>;
    const points = data['dataPoints'] as Array<Record<string, unknown>>;
    const point = points[0];
    // 2026-09 呼吸内科 收入980 成本760 → 毛利220
    expect(point['grossMarginWan']).toBe(220);
    expect(point['revenueWan']).toBe(980);
  });
});
