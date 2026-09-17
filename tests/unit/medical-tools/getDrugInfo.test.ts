/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 药品信息查询 get_drug_info
 */

import { describe, it, expect } from 'bun:test';
import { getDrugInfoTool } from '@medical/pharmacy/getDrugInfo';
import { createMedicalToolContext } from './helpers';

describe('get_drug_info', () => {
  it('按通用名查询阿司匹林返回完整说明书', async () => {
    const ctx = createMedicalToolContext();
    const result = await getDrugInfoTool.execute(
      { drugName: '阿司匹林', infoType: 'all' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['drugName']).toBe('阿司匹林肠溶片');
    expect(data['category']).toBe('抗血小板药');
    expect(data['indication']).toBeTruthy();
    expect((data['contraindications'] as string[]).length).toBeGreaterThan(0);
    expect((data['interactions'] as string[]).length).toBeGreaterThan(0);
  });

  it('按 infoType=dosage 仅返回用法用量', async () => {
    const ctx = createMedicalToolContext();
    const result = await getDrugInfoTool.execute(
      { drugName: '二甲双胍', infoType: 'dosage' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['drugName']).toBe('二甲双胍片');
    expect(data['dosage']).toBeTruthy();
    expect(data['indication']).toBeUndefined();
  });

  it('别名匹配（氯吡格雷/波立维）', async () => {
    const ctx = createMedicalToolContext();
    const result = await getDrugInfoTool.execute(
      { drugName: '波立维' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['drugName']).toBe('氯吡格雷片');
  });

  it('未知药品返回 DRUG_NOT_FOUND 并列出可用药品', async () => {
    const ctx = createMedicalToolContext();
    const result = await getDrugInfoTool.execute(
      { drugName: '不存在的药XYZ' },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DRUG_NOT_FOUND');
    expect(
      (result.error?.details as Record<string, unknown>)['availableDrugs'],
    ).toBeInstanceOf(Array);
  });
});
