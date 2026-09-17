/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 就诊提醒 visit_reminder
 */

import { describe, it, expect } from 'bun:test';
import { visitReminderTool } from '@medical/patient-service/visitReminder';
import { createMedicalToolContext } from './helpers';

describe('visit_reminder', () => {
  it('可查询到患者即将到来的预约就诊提醒', async () => {
    const ctx = createMedicalToolContext();
    const result = await visitReminderTool.execute(
      { patientId: 'P2026090001', reminderType: 'appointment', daysAhead: 30 },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['total'] as number).toBeGreaterThanOrEqual(1);
    const list = data['reminders'] as Array<Record<string, unknown>>;
    expect(list.some((r) => r['type'] === '预约就诊')).toBe(true);
  });

  it('患者姓名脱敏（保留姓）', async () => {
    const ctx = createMedicalToolContext();
    const result = await visitReminderTool.execute(
      { patientId: 'P2026090001', reminderType: 'appointment', daysAhead: 30 },
      ctx,
    );
    const data = result.data as Record<string, unknown>;
    expect(data['patientName']).toBe('张**');
  });

  it('可查询到患者随访提醒', async () => {
    const ctx = createMedicalToolContext();
    const result = await visitReminderTool.execute(
      { patientId: 'P2026090004', reminderType: 'followUp', daysAhead: 30 },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['total'] as number).toBeGreaterThanOrEqual(1);
  });

  it('患者不存在返回 PATIENT_NOT_FOUND', async () => {
    const ctx = createMedicalToolContext();
    const result = await visitReminderTool.execute(
      { patientId: 'P_NOT_EXIST' },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PATIENT_NOT_FOUND');
  });
});
