/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 随访管理 follow_up_management
 */

import { describe, it, expect } from 'bun:test';
import { followUpManagementTool } from '@medical/patient-service/followUpManagement';
import { createMedicalToolContext } from './helpers';

describe('follow_up_management', () => {
  it('查询患者现有随访计划', async () => {
    const ctx = createMedicalToolContext();
    const result = await followUpManagementTool.execute(
      { patientId: 'P2026090001' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['mode']).toBe('queried');
    expect(data['total'] as number).toBeGreaterThanOrEqual(1);
  });

  it('可按类型筛选随访计划', async () => {
    const ctx = createMedicalToolContext();
    const result = await followUpManagementTool.execute(
      { patientId: 'P2026090002', followUpType: '出院随访' },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['total']).toBe(1);
    const list = data['followUps'] as Array<Record<string, unknown>>;
    expect(list[0]['followUpType']).toBe('出院随访');
  });

  it('传入plan与type可新建随访计划', async () => {
    const ctx = createMedicalToolContext();
    const result = await followUpManagementTool.execute(
      {
        patientId: 'P2026090006',
        followUpType: '用药随访',
        plan: '甲亢用药随访，复查甲功',
        nextFollowUpDate: '2026-10-16',
      },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['mode']).toBe('created');
    expect(data['total']).toBe(1);
    const list = data['followUps'] as Array<Record<string, unknown>>;
    expect(list[0]['status']).toBe('待随访');
    expect(list[0]['nextFollowUpDate']).toBe('2026-10-16');
  });

  it('新建随访未指定类型返回 TYPE_REQUIRED', async () => {
    const ctx = createMedicalToolContext();
    const result = await followUpManagementTool.execute(
      { patientId: 'P2026090006', plan: '缺少类型的计划' },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TYPE_REQUIRED');
  });

  it('患者不存在返回 PATIENT_NOT_FOUND', async () => {
    const ctx = createMedicalToolContext();
    const result = await followUpManagementTool.execute(
      { patientId: 'P_NOT_EXIST' },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PATIENT_NOT_FOUND');
  });
});
