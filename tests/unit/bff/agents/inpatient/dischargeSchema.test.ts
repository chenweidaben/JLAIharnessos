/**
 * S-10 出院记录 Schema 与住院草稿校验单测（4.3.4 / 4.3.5）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import {
  appendPendingMarker,
  buildDischargeRecord,
  buildInpatientDraft,
  buildNoEvidenceSections,
  validateInpatientDraft,
} from '@/bff/agents/inpatient/dischargeSchema.js';
import { demoCitations } from './fixtures.js';

function validDischargeRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const { discharge: dischargeOverrides = {}, ...rootOverrides } = overrides;
  return {
    documentType: 'discharge-record',
    title: '出院记录',
    chiefComplaint: '咳嗽咳痰 3 天。',
    presentIllness: '入院后完善检查并对症治疗。',
    sections: {},
    diagnosis: [],
    suggestions: [],
    keyNodes: [
      { time: '2026-10-05T09:00:00+08:00', event: '诊断变更：补充气道高反应评估', source: 'senior-round' },
      { time: '2026-10-08T11:00:00+08:00', event: '手术：胸腔穿刺（合成演示）', source: 'operation-record' },
      { time: '2026-10-10T20:00:00+08:00', event: '危急值：血钾 2.8 mmol/L', source: 'lab-report' },
    ],
    treatmentPlanAdjustment: false,
    missingInfo: [],
    citations: demoCitations,
    evidenceLevel: 'supported',
    ...rootOverrides,
    discharge: {
      admissionDiagnosis: [{ code: 'J18.9', name: '肺炎' }],
      dischargeDiagnosis: [{ code: 'J18.9', name: '肺炎', relation: 'consistent' }],
      treatmentSummary: '入院后抗感染、对症支持治疗后症状好转。[1]',
      conditionOnDischarge: 'improved',
      followUp: [{ timing: '2 周后门诊复查', advice: '复查胸片与血常规' }],
      dischargeInstructions: '避免受凉，按门诊随访安排复查。',
      timelineNodes: [
        { time: '2026-10-05T09:00:00+08:00', event: '诊断变更：补充气道高反应评估', source: 'senior-round' },
        { time: '2026-10-10T20:00:00+08:00', event: '危急值：血钾 2.8 mmol/L', source: 'lab-report' },
      ],
      citations: demoCitations,
      missingInfo: [],
      ...(dischargeOverrides as Record<string, unknown>),
    },
  };
}

describe('出院记录 Schema - 通过用例', () => {
  it('合法出院记录通过对照关系与枚举校验', () => {
    const result = validateInpatientDraft(validDischargeRaw());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.draft?.discharge?.conditionOnDischarge).toBe('improved');
  });

  it('adjusted 诊断关联入院诊断并记录调整依据', () => {
    const raw = validDischargeRaw({
      discharge: {
        admissionDiagnosis: [{ code: 'J18.9', name: '肺炎' }],
        dischargeDiagnosis: [
          { code: 'J18.9', name: '肺炎', relation: 'consistent' },
          {
            code: 'J45.9',
            name: '气道高反应待查',
            relation: 'adjusted',
            relatedAdmissionCode: 'J18.9',
            basisNote: '入院后肺功能提示气道高反应，诊断由单纯肺炎调整为肺炎合并气道高反应待查。',
          },
        ],
        treatmentSummary: '治疗经过见病程记录[1]。',
        conditionOnDischarge: 'improved',
        followUp: [{ timing: '2 周后', advice: '复查肺功能' }],
        dischargeInstructions: '门诊随访。',
        timelineNodes: [{ time: '2026-10-05T09:00:00+08:00', event: '诊断调整', source: 'senior-round' }],
        citations: demoCitations,
        missingInfo: [],
      },
    });
    expect(validateInpatientDraft(raw).valid).toBe(true);
  });

  it('new 诊断记录新增依据并通过校验', () => {
    const raw = validDischargeRaw({
      discharge: {
        admissionDiagnosis: [{ code: 'J18.9', name: '肺炎' }],
        dischargeDiagnosis: [
          { code: 'J18.9', name: '肺炎', relation: 'consistent' },
          { code: 'I10', name: '高血压 1 级', relation: 'new', basisNote: '住院期间多次血压监测升高，新增高血压诊断。' },
        ],
        treatmentSummary: '住院期间监测发现血压升高[1]。',
        conditionOnDischarge: 'improved',
        followUp: [{ timing: '1 个月后', advice: '心内科随访' }],
        dischargeInstructions: '监测血压。',
        timelineNodes: [{ time: '2026-10-08T08:00:00+08:00', event: '血压升高记录', source: 'nursing-note' }],
        citations: demoCitations,
        missingInfo: [],
      },
    });
    expect(validateInpatientDraft(raw).valid).toBe(true);
  });

  it('长住院关键节点在 Schema 载荷中不丢失', () => {
    const result = validateInpatientDraft(validDischargeRaw());
    expect(result.draft?.keyNodes.map((node) => node.event)).toEqual(
      expect.arrayContaining(['诊断变更：补充气道高反应评估', '手术：胸腔穿刺（合成演示）', '危急值：血钾 2.8 mmol/L']),
    );
  });
});

describe('出院记录 Schema - 拦截用例', () => {
  it('非法出院状态枚举被拦截', () => {
    const raw = validDischargeRaw();
    (raw.discharge as Record<string, unknown>).conditionOnDischarge = 'unknown-status';
    const result = validateInpatientDraft(raw);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('conditionOnDischarge'))).toBe(true);
  });

  it('consistent 诊断无法对应入院诊断时被拦截', () => {
    const raw = validDischargeRaw({
      discharge: {
        admissionDiagnosis: [{ code: 'J18.9', name: '肺炎' }],
        dischargeDiagnosis: [{ code: 'I10', name: '高血压', relation: 'consistent' }],
        treatmentSummary: '见病程记录[1]。',
        conditionOnDischarge: 'improved',
        followUp: [],
        dischargeInstructions: '门诊随访。',
        timelineNodes: [],
        citations: demoCitations,
        missingInfo: [],
      },
    });
    const result = validateInpatientDraft(raw);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('consistent'))).toBe(true);
  });

  it('adjusted 诊断缺少入院对照或调整依据时被拦截', () => {
    const raw = validDischargeRaw({
      discharge: {
        admissionDiagnosis: [{ code: 'J18.9', name: '肺炎' }],
        dischargeDiagnosis: [{ code: 'J45.9', name: '气道高反应待查', relation: 'adjusted' }],
        treatmentSummary: '见病程记录[1]。',
        conditionOnDischarge: 'improved',
        followUp: [],
        dischargeInstructions: '门诊随访。',
        timelineNodes: [],
        citations: demoCitations,
        missingInfo: [],
      },
    });
    const result = validateInpatientDraft(raw);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('adjusted'))).toBe(true);
  });

  it('出院诊断未挂引用编号时被拦截', () => {
    const raw = validDischargeRaw();
    (raw.discharge as Record<string, unknown>).citations = [];
    (raw.discharge as Record<string, unknown>).missingInfo = ['未获取到检验引用'];
    raw.citations = [];
    raw.evidenceLevel = 'none';
    const result = validateInpatientDraft(raw);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('出院诊断方向必须挂引用编号'))).toBe(true);
  });

  it('followUp 条目缺少时间或建议时被拦截', () => {
    const raw = validDischargeRaw();
    (raw.discharge as Record<string, unknown>).followUp = [{ timing: '', advice: '' }];
    const result = validateInpatientDraft(raw);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('followUp'))).toBe(true);
  });
});

describe('住院草稿 Schema - 引用闭环与缺项标记', () => {
  it('检查建议缺少引用编号被拦截', () => {
    const draft = buildInpatientDraft({
      documentType: 'daily-progress',
      chiefComplaint: '咳嗽咳痰 3 天',
      suggestions: [
        { kind: 'exam', content: '复查胸片', citations: [], basisNote: '观察肺部炎症吸收情况' },
      ],
      citations: [],
    });
    const result = validateInpatientDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('检查建议必须挂引用编号'))).toBe(true);
  });

  it('evidenceLevel 与引用 / 缺项清单不一致时被拦截', () => {
    const draft = buildInpatientDraft({
      documentType: 'daily-progress',
      chiefComplaint: '咳嗽咳痰 3 天',
      citations: demoCitations,
      missingInfo: [],
    });
    draft.evidenceLevel = 'none';
    const result = validateInpatientDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('evidenceLevel'))).toBe(true);
  });

  it('无依据结论追加「（待核实）」标记，缺项清单纳入拒答口径', () => {
    expect(appendPendingMarker('')).toBe('（待核实）');
    expect(appendPendingMarker('病史待补充')).toBe('（待核实）病史待补充');
    const answer = buildNoEvidenceSections('检验报告解读', ['未检索到可引用指南条目']);
    expect(answer.missingInfo).toContain('未检索到可引用指南条目');
    expect(answer.content).toContain('（待核实）');
  });

  it('buildDischargeRecord 按 4.3.4 字段装配', () => {
    const record = buildDischargeRecord({
      admissionDiagnosis: [{ code: 'J18.9', name: '肺炎' }],
      dischargeDiagnosis: [{ code: 'J18.9', name: '肺炎', relation: 'consistent' }],
      treatmentSummary: '治疗好转[1]。',
      conditionOnDischarge: 'cured',
      followUp: [{ timing: '2 周后', advice: '门诊复查' }],
      dischargeInstructions: '避免受凉。',
      timelineNodes: [{ time: '2026-10-08T08:00:00+08:00', event: '症状缓解', source: 'daily-progress' }],
      citations: demoCitations,
    });
    expect(record.conditionOnDischarge).toBe('cured');
    expect(record.dischargeDiagnosis[0].relation).toBe('consistent');
  });
});
