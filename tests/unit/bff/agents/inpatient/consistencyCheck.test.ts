/**
 * S-10 住院病历一致性校验单测（4.3.2 consistency-check）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import { runConsistencyCheck } from '@/bff/agents/inpatient/consistencyCheck.js';
import { buildInpatientDraft } from '@/bff/agents/inpatient/dischargeSchema.js';
import { demoCitations, demoFacts } from './fixtures.js';
import type { InpatientDraft } from '@/bff/agents/inpatient/types.js';

function makeDraft(overrides: Partial<InpatientDraft>): InpatientDraft {
  return buildInpatientDraft({
    documentType: 'daily-progress',
    chiefComplaint: '咳嗽咳痰 3 天',
    presentIllness: '咳嗽咳痰 3 天，伴少量白痰。',
    historyIllness: '既往体健。',
    physicalExam: '双肺呼吸音粗，未闻及明显啰音。',
    auxiliaryExams: '胸片提示双肺纹理增多[1]。',
    orders: '对症支持治疗。',
    sections: {},
    diagnosis: [{ code: 'R05', name: '咳嗽待查', certainty: 'likely' }],
    suggestions: [],
    keyNodes: [],
    citations: demoCitations,
    ...overrides,
  });
}

describe('住院一致性校验 - 通过用例', () => {
  it('主诉、诊断、查体、医嘱与检验方向一致时不产出阻断或提醒发现', () => {
    const findings = runConsistencyCheck(makeDraft({}), { facts: demoFacts });
    expect(findings.filter((finding) => finding.severity !== 'info')).toEqual([]);
  });
});

describe('住院一致性校验 - 正反规则用例', () => {
  it('主诉与诊断方向不对应时产出 caution', () => {
    const draft = makeDraft({
      chiefComplaint: '胸痛 2 天',
      diagnosis: [{ code: 'R51', name: '头痛待查', certainty: 'possible' }],
    });
    const findings = runConsistencyCheck(draft, { facts: demoFacts });
    expect(findings.some((finding) => finding.rule === 'complaint-diagnosis' && finding.severity === 'caution')).toBe(true);
  });

  it('事实快照诊断在病历中被否认时产出 block', () => {
    const draft = makeDraft({ historyIllness: '否认高血压病史。' });
    const facts = { ...demoFacts, diagnoses: ['高血压'] };
    const findings = runConsistencyCheck(draft, { facts });
    expect(findings.some((finding) => finding.rule === 'physical-exam-diagnosis' && finding.severity === 'block')).toBe(true);
  });

  it('诊断方向与医嘱用药方向明显冲突时产出 caution', () => {
    const draft = makeDraft({
      diagnosis: [{ code: 'J18.9', name: '肺炎', certainty: 'likely' }],
      orders: '停用抗菌药物，仅观察。',
    });
    const findings = runConsistencyCheck(draft, { facts: demoFacts });
    expect(findings.some((finding) => finding.rule === 'orders-diagnosis' && finding.severity === 'caution')).toBe(true);
  });

  it('检验检查结论未挂引用编号时产出 caution', () => {
    const draft = makeDraft({
      auxiliaryExams: '胸片提示肺部感染，需结合临床判断。',
      citations: [],
    });
    const findings = runConsistencyCheck(draft, { facts: demoFacts, examResults: ['胸片提示肺部感染'] });
    expect(findings.some((finding) => finding.rule === 'exam-result-citation' && finding.severity === 'caution')).toBe(true);
  });

  it('事实快照诊断未进入时间线且既往史被整体否认时产出 block', () => {
    const draft = makeDraft({
      diagnosis: [],
      historyIllness: '否认既往诊断。',
      presentIllness: '本次新发咳嗽咳痰。',
    });
    const facts = { ...demoFacts, diagnoses: ['2型糖尿病'] };
    const findings = runConsistencyCheck(draft, { facts });
    expect(findings.some((finding) => finding.rule === 'timeline-consistency' && finding.severity === 'block')).toBe(true);
  });
});
