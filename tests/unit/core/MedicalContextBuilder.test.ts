/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { describe, expect, test } from 'bun:test';
import { MedicalContextBuilder } from '@/core/context/MedicalContextBuilder';
import { createMockPatient, createMockEncounter } from '../tools/testHelpers';
import type { Order, LabResult } from '@/types';

describe('MedicalContextBuilder', () => {
  const builder = new MedicalContextBuilder();

  test('无数据时返回空文本', () => {
    const ctx = builder.build({});
    expect(ctx.text).toBe('');
    expect(ctx.segments).toHaveLength(0);
  });

  test('患者摘要包含姓名/诊断/过敏史', () => {
    const ctx = builder.build({
      patient: createMockPatient(),
    });
    expect(ctx.text).toContain('张*三');
    expect(ctx.text).toContain('冠心病');
    expect(ctx.text).toContain('青霉素过敏');
    expect(ctx.tokens.patientSummary).toBeGreaterThan(0);
  });

  test('就诊摘要包含主诉', () => {
    const ctx = builder.build({
      encounter: createMockEncounter(),
    });
    expect(ctx.text).toContain('胸闷胸痛3天');
    expect(ctx.tokens.encounterSummary).toBeGreaterThan(0);
  });

  test('活跃医嘱只保留进行中的医嘱', () => {
    const orders: Order[] = [
      {
        orderId: 'O1', patientId: 'P1', encounterId: 'E1', orderType: 'medication',
        content: '阿司匹林 100mg qd', status: 'ordered', orderingDoctorId: 'd1',
        orderingDoctorName: '医生', orderedAt: '2026-09-16',
      },
      {
        orderId: 'O2', patientId: 'P1', encounterId: 'E1', orderType: 'lab_test',
        content: '血常规', status: 'cancelled', orderingDoctorId: 'd1',
        orderingDoctorName: '医生', orderedAt: '2026-09-16',
      },
    ] as unknown as Order[];
    const ctx = builder.build({ activeOrders: orders });
    expect(ctx.text).toContain('阿司匹林');
    expect(ctx.text).not.toContain('血常规');
  });

  test('检验结果异常值高亮', () => {
    const labs: LabResult[] = [
      {
        labResultId: 'L1', patientId: 'P1', encounterId: 'E1', category: '临床生化',
        items: [
          { testCode: 'c1', testName: '肌钙蛋白', value: '0.5', abnormalFlag: 'high', isCritical: true },
          { testCode: 'c2', testName: '白细胞', value: '6.0', abnormalFlag: 'normal', isCritical: false },
        ],
        status: 'completed', labDepartment: '检验科', reportedAt: '2026-09-16',
      },
    ] as unknown as LabResult[];
    const ctx = builder.build({ recentLabs: labs });
    expect(ctx.text).toContain('肌钙蛋白');
    expect(ctx.text).toContain('危急');
    expect(ctx.text).not.toContain('白细胞');
  });
});
