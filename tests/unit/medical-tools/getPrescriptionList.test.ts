/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 查询处方列表 get_prescription_list
 */

import { describe, it, expect } from 'bun:test';
import { getPrescriptionListTool } from '@medical/pharmacy/getPrescriptionList';
import { createMedicalToolContext } from './helpers';

describe('get_prescription_list', () => {
  it('可查询到患者 P2026090001 的处方', async () => {
    const ctx = createMedicalToolContext();
    const result = await getPrescriptionListTool.execute(
      { patientId: 'P2026090001' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['total'] as number).toBeGreaterThanOrEqual(1);
    const list = data['prescriptions'] as Array<Record<string, unknown>>;
    expect(list[0]['prescriptionId']).toBe('RX20260912001');
  });

  it('按状态"待审核"筛选返回 P2026090002 的处方', async () => {
    const ctx = createMedicalToolContext();
    const result = await getPrescriptionListTool.execute(
      { patientId: 'P2026090002', status: '待审核' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['total']).toBe(1);
    const list = data['prescriptions'] as Array<Record<string, unknown>>;
    expect(list[0]['status']).toBe('待审核');
  });

  it('未知患者返回空列表', async () => {
    const ctx = createMedicalToolContext();
    const result = await getPrescriptionListTool.execute(
      { patientId: 'P_NOT_EXIST' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['total']).toBe(0);
    expect(data['prescriptions']).toEqual([]);
  });

  it('按就诊ID过滤生效', async () => {
    const ctx = createMedicalToolContext();
    const result = await getPrescriptionListTool.execute(
      { patientId: 'P2026090001', encounterId: 'E20260912001' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['total']).toBe(1);
  });
});
