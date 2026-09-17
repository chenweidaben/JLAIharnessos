/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 单元测试 - 开具处方 create_prescription
 */

import { describe, it, expect } from 'bun:test';
import { createPrescriptionTool } from '@medical/pharmacy/createPrescription';
import { createMedicalToolContext } from './helpers';

describe('create_prescription', () => {
  it('执业医师可成功开具无风险处方，返回待审核与费用预估', async () => {
    const ctx = createMedicalToolContext({ role: 'doctor' });
    const result = await createPrescriptionTool.execute(
      {
        patientId: 'P2026090003',
        encounterId: 'E20260911007',
        prescriptionType: '西药',
        diagnosis: '急性胃炎',
        drugs: [
          {
            drugName: '氨溴索口服液',
            specification: '100ml:0.6g',
            dosage: '30mg',
            frequency: 'tid',
            days: 7,
            quantity: 1,
            usage: '口服，每日三次，每次10ml',
          },
        ],
      },
      ctx,
    );

    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data['prescriptionId']).toStartWith('RX');
    expect(data['status']).toBe('待审核');
    expect(data['requiresPharmacistReview']).toBe(true);
    expect(data['requiresDoubleConfirm']).toBe(true);
    expect(data['requiresCASignature']).toBe(true);
    expect((data['feeEstimate'] as Record<string, number>)['totalFee']).toBeGreaterThan(0);
  });

  it('非医生角色被阻止开具处方', async () => {
    const ctx = createMedicalToolContext({ role: 'nurse' });
    const result = await createPrescriptionTool.execute(
      {
        patientId: 'P2026090003',
        encounterId: 'E20260911007',
        prescriptionType: '西药',
        drugs: [
          {
            drugName: '氨溴索口服液',
            specification: '100ml:0.6g',
            dosage: '30mg',
            frequency: 'tid',
            days: 7,
            quantity: 1,
            usage: '口服，每日三次，每次10ml',
          },
        ],
      },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('LICENSE_REQUIRED');
  });

  it('患者存在危及生命过敏时，开具致敏药物被安全检查阻止', async () => {
    // P2026090005 华法林过敏（危及生命）
    const ctx = createMedicalToolContext({ role: 'doctor' });
    const result = await createPrescriptionTool.execute(
      {
        patientId: 'P2026090005',
        encounterId: 'E20260914006',
        prescriptionType: '西药',
        drugs: [
          {
            drugName: '华法林钠片',
            specification: '2.5mg',
            dosage: '2.5mg',
            frequency: 'qd',
            days: 30,
            quantity: 30,
            usage: '口服，每日一次',
          },
        ],
      },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('SAFETY_BLOCKED');
    expect(
      (result.error?.details as Record<string, string[]>)['allergyAlerts'].length,
    ).toBeGreaterThan(0);
  });

  it('患者当前用药含阿司匹林时，新增华法林触发禁忌并被阻止', async () => {
    // P2026090001 当前在用阿司匹林，华法林+阿司匹林为禁忌
    const ctx = createMedicalToolContext({ role: 'doctor' });
    const result = await createPrescriptionTool.execute(
      {
        patientId: 'P2026090001',
        encounterId: 'E20260912001',
        prescriptionType: '西药',
        drugs: [
          {
            drugName: '华法林钠片',
            specification: '2.5mg',
            dosage: '2.5mg',
            frequency: 'qd',
            days: 30,
            quantity: 30,
            usage: '口服，每日一次',
          },
        ],
      },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('SAFETY_BLOCKED');
    expect(
      (result.error?.details as Record<string, string[]>)['contraindications'].length,
    ).toBeGreaterThan(0);
  });

  it('患者不存在时返回错误', async () => {
    const ctx = createMedicalToolContext({ role: 'doctor' });
    const result = await createPrescriptionTool.execute(
      {
        patientId: 'P_NOT_EXIST',
        encounterId: 'E1',
        prescriptionType: '西药',
        drugs: [
          {
            drugName: '氨溴索口服液',
            specification: 'x',
            dosage: '30mg',
            frequency: 'tid',
            days: 7,
            quantity: 1,
            usage: '口服',
          },
        ],
      },
      ctx,
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PATIENT_NOT_FOUND');
  });
});
