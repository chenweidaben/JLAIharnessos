/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 预约挂号 appointment_registration
 */

import { describe, it, expect } from 'bun:test';
import { appointmentRegistrationTool } from '@medical/patient-service/appointmentRegistration';
import { createMedicalToolContext } from './helpers';

describe('appointment_registration', () => {
  it('可成功预约心血管内科2026-09-18号源（自动选最早余号时段）', async () => {
    const ctx = createMedicalToolContext();
    const result = await appointmentRegistrationTool.execute(
      {
        patientId: 'P2026090001',
        department: '心血管内科',
        date: '2026-09-18',
        visitType: '复诊',
      },
      ctx,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['appointmentId']).toStartWith('AP');
    expect(data['doctorName']).toBe('王主任');
    expect(data['timeSlot']).toBe('08:00-09:00');
    expect(data['status']).toBe('已预约');
    expect(data['queueNo'] as number).toBeGreaterThan(0);
  });

  it('指定已约满时段返回 SLOT_FULL', async () => {
    // 陈医生(D0002) 呼吸内科 2026-09-18 AM1 为 15/15 已满
    const ctx = createMedicalToolContext();
    const result = await appointmentRegistrationTool.execute(
      {
        patientId: 'P2026090002',
        department: '呼吸内科',
        doctorId: 'D0002',
        date: '2026-09-18',
        timeSlot: '08:00-09:00',
      },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('SLOT_FULL');
  });

  it('未排班的科室/日期返回 NO_SCHEDULE', async () => {
    const ctx = createMedicalToolContext();
    const result = await appointmentRegistrationTool.execute(
      {
        patientId: 'P2026090001',
        department: '骨科',
        date: '2026-09-18',
      },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NO_SCHEDULE');
  });

  it('患者不存在返回 PATIENT_NOT_FOUND', async () => {
    const ctx = createMedicalToolContext();
    const result = await appointmentRegistrationTool.execute(
      {
        patientId: 'P_NOT_EXIST',
        department: '心血管内科',
        date: '2026-09-18',
      },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PATIENT_NOT_FOUND');
  });
});
