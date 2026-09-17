/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - 质控管理工具
 */

import { describe, it, expect } from 'bun:test';
import type { MedicalToolContext } from '@/medical-tools/types.js';
import { medicalRecordQualityCheckTool } from '@/medical-tools/quality/medicalRecordQualityCheck.js';
import { medicalRecordFrontPageCheckTool } from '@/medical-tools/quality/medicalRecordFrontPageCheck.js';
import { coreSystemCheckTool } from '@/medical-tools/quality/coreSystemCheck.js';

/** 工具实现忽略 context，使用最小上下文即可 */
const ctx = {} as MedicalToolContext;

describe('medical_record_quality_check 病历质控', () => {
  it('应返回质控得分、等级与缺陷列表', async () => {
    const res = await medicalRecordQualityCheckTool.execute(
      { recordId: 'MR001' },
      ctx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      qcScore: number;
      grade: string;
      issues: unknown[];
      statistics: { failedChecks: number };
      disclaimer: string;
    };
    expect(data.qcScore).toBeGreaterThan(0);
    expect(['甲级', '乙级', '丙级']).toContain(data.grade);
    expect(data.issues.length).toBeGreaterThanOrEqual(5); // 5-8条缺陷
    expect(data.issues.length).toBeLessThanOrEqual(8);
    expect(data.statistics.failedChecks).toBe(data.issues.length);
    expect(data.disclaimer).toContain('仅供参考');
  });

  it('按 checkType 过滤缺陷类型', async () => {
    const res = await medicalRecordQualityCheckTool.execute(
      { recordId: 'MR001', checkType: '完整性质控' },
      ctx,
    );
    const data = res.data as { issues: { checkType: string }[] };
    expect(data.issues.every((i) => i.checkType === '完整性质控')).toBe(true);
  });

  it('缺少 recordId 与 recordContent 应校验失败', async () => {
    await expect(
      medicalRecordQualityCheckTool.execute({}, ctx),
    ).rejects.toThrow();
  });
});

describe('medical_record_front_page_check 病案首页质控', () => {
  it('缺少 ICD 编码应给出严重缺陷', async () => {
    const res = await medicalRecordFrontPageCheckTool.execute(
      {
        frontPageData: {
          patientId: 'P001',
          mainDiagnosis: '冠心病',
          secondaryDiagnoses: ['高血压'],
          surgeries: [{ name: '冠状动脉支架植入术' }],
          dischargeDisposition: '正常出院',
          totalCost: 45000,
        },
      },
      ctx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      mainDiagnosisAssessment: { isCorrect: boolean };
      surgeryCodingAssessment: { incomplete: boolean };
      drgGroupSuggestion: { groupCode: null | string };
      defects: { severity: string }[];
    };
    expect(data.mainDiagnosisAssessment.isCorrect).toBe(false);
    expect(data.surgeryCodingAssessment.incomplete).toBe(true);
    expect(data.defects.some((d) => d.severity === '严重')).toBe(true);
  });
});

describe('core_system_check 核心制度质控', () => {
  it('应返回各制度执行率与总体合规率', async () => {
    const res = await coreSystemCheckTool.execute(
      { department: '心内科', checkType: '全部' },
      ctx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      items: { systemName: string; complianceRate: number; status: string }[];
      overallComplianceRate: number;
    };
    expect(data.items.length).toBeGreaterThanOrEqual(5);
    expect(data.items.map((i) => i.systemName)).toContain('三级查房');
    expect(data.overallComplianceRate).toBeGreaterThan(0);
  });

  it('按制度类型过滤', async () => {
    const res = await coreSystemCheckTool.execute({ checkType: '术前讨论' }, ctx);
    const data = res.data as { items: { systemName: string }[] };
    expect(data.items.length).toBe(1);
    expect(data.items[0].systemName).toBe('术前讨论');
  });
});
