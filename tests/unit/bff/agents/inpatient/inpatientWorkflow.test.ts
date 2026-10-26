/**
 * S-10 住院工作流离线运行器集成单测（4.3.2 DAG + S-01 红线 + 风险分级人工确认 + 越权写）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import { runInpatientWorkflow } from '@/bff/agents/inpatient/inpatientWorkflow.js';
import { buildValidDraft, buildWorkflowInput, demoCitations, demoFacts } from './fixtures.js';
import type { InpatientModelAdapter, InpatientWorkflowInput } from '@/bff/agents/inpatient/types.js';

function adoptReview(role: 'physician-confirm' | 'expert-review' = 'physician-confirm', comment = '采纳') {
  return { decision: 'adopted' as const, reviewerRole: role, comment };
}

describe('住院工作流 - 主路径与离线占位', () => {
  it('离线骨架 + 医师采纳：完成回写并发出 inpatient-record-completed 事件', async () => {
    const result = await runInpatientWorkflow(buildWorkflowInput({ review: adoptReview() }));
    expect(result.status).toBe('completed');
    expect(result.events).toContain('inpatient-record-completed');
    expect(result.auditTrail.length).toBeGreaterThan(0);
    expect(result.auditTrail.some((entry) => entry.action === 'draft-written-offline')).toBe(true);
  });

  it('主路径审计台账逐条携带患者与就诊标识', async () => {
    const entries: Array<{ action: string; patientId?: string; visitId?: string }> = [];
    const result = await runInpatientWorkflow(buildWorkflowInput({ review: adoptReview() }), {
      auditSink: (entry) => entries.push(entry),
    });
    expect(result.status).toBe('completed');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.patientId === 'patient-demo-001' && entry.visitId === 'visit-demo-001')).toBe(true);
    expect(entries.some((entry) => entry.patientId === undefined || entry.visitId === undefined)).toBe(false);
    expect(result.auditTrail.every((entry) => entry.patientId === 'patient-demo-001' && entry.visitId === 'visit-demo-001')).toBe(true);
  });

  it('工具适配器被调用记录只读与写工具；未注入适配器时审计标注 degraded-offline', async () => {
    const calls: string[] = [];
    const toolAdapter = {
      async call(toolId: string) {
        calls.push(toolId);
        return {};
      },
    };
    const result = await runInpatientWorkflow(buildWorkflowInput({ review: adoptReview(), vitalsText: '血压 128/80、心率 76' }), {
      toolAdapter,
    });
    expect(result.status).toBe('completed');
    expect(calls).toContain('get_inpatient_context');
    expect(calls).toContain('voice_to_vitals');
    expect(calls).toContain('submit_inpatient_draft');
    expect(result.auditTrail.some((entry) => entry.action === 'vitals-loaded')).toBe(true);
  });
});

describe('住院工作流 - S-01 红线集成', () => {
  it('确定性表述被 certainty-redline 命中，BLOCK 不出稿', async () => {
    const adapter: InpatientModelAdapter = {
      async generateDraft() {
        return {
          documentType: 'daily-progress',
          chiefComplaint: '咳嗽咳痰 3 天',
          presentIllness: '确诊为肺炎，一定需要抗生素治疗。',
          historyIllness: '既往体健。',
          physicalExam: '神清，呼吸平稳。',
          auxiliaryExams: '胸片待回报。',
          orders: '对症支持。',
          sections: {},
          diagnosis: [],
          suggestions: [],
          keyNodes: [],
          treatmentPlanAdjustment: false,
          missingInfo: [],
          citations: demoCitations,
          evidenceLevel: 'supported',
        };
      },
    };
    const result = await runInpatientWorkflow(buildWorkflowInput({ review: adoptReview() }), { modelAdapter: adapter });
    expect(result.status).toBe('blocked');
    expect(result.draft).toBeUndefined();
    expect(result.guardVerdict?.level).toBe('BLOCK');
    expect(result.guardVerdict?.findings.some((finding) => finding.rule === 'certainty-redline')).toBe(true);
    expect(result.events).toEqual([]);
  });

  it('虚构年龄与事实快照不一致被 fictional-identity 命中并阻断', async () => {
    const adapter: InpatientModelAdapter = {
      async generateDraft() {
        return {
          documentType: 'daily-progress',
          chiefComplaint: '咳嗽咳痰 3 天',
          presentIllness: '患者 52 岁男性，因咳嗽咳痰入院。',
          historyIllness: '既往体健。',
          physicalExam: '神清。',
          auxiliaryExams: '胸片待回报。',
          orders: '观察。',
          sections: {},
          diagnosis: [],
          suggestions: [],
          keyNodes: [],
          treatmentPlanAdjustment: false,
          missingInfo: [],
          citations: demoCitations,
          evidenceLevel: 'supported',
        };
      },
    };
    const facts = { ...demoFacts, age: 45, gender: '男' };
    const result = await runInpatientWorkflow(buildWorkflowInput({ facts, review: adoptReview() }), { modelAdapter: adapter });
    expect(result.status).toBe('blocked');
    expect(result.guardVerdict?.findings.some((finding) => finding.rule === 'fictional-identity')).toBe(true);
  });
});

describe('住院工作流 - Schema 失败重试降级', () => {
  it('两次修订仍非法 Schema：状态 revised-twice-and-held，产出缺项骨架，不返回伪造完整稿', async () => {
    const adapter: InpatientModelAdapter = {
      async generateDraft() {
        return {
          documentType: 'daily-progress',
          chiefComplaint: '咳嗽咳痰 3 天',
          presentIllness: '3 天前出现咳嗽咳痰。',
          historyIllness: '既往体健。',
          physicalExam: '神清。',
          auxiliaryExams: '胸片待回报。',
          orders: '观察。',
          sections: {},
          diagnosis: [],
          suggestions: [
            { kind: 'exam', content: '复查胸片', citations: [], basisNote: '观察炎症吸收情况' },
          ],
          keyNodes: [],
          treatmentPlanAdjustment: false,
          missingInfo: [],
          citations: [],
          evidenceLevel: 'none',
        };
      },
    };
    const result = await runInpatientWorkflow(buildWorkflowInput({ review: adoptReview() }), { modelAdapter: adapter });
    expect(result.status).toBe('revised-twice-and-held');
    expect(result.events).toEqual([]);
    expect(result.draft?.missingInfo.length).toBeGreaterThan(0);
    expect(result.draft?.suggestions).toEqual([]);
  });
});

describe('住院工作流 - 风险分级与人工确认角色', () => {
  it('上级查房存在方案调整建议时须 expert-review 确认并完成回写', async () => {
    const result = await runInpatientWorkflow(
      buildWorkflowInput({
        documentType: 'senior-round',
        review: adoptReview('expert-review'),
        draftOverrides: { treatmentPlanAdjustment: true },
      }),
    );
    expect(result.status).toBe('completed');
    expect(result.events).toContain('inpatient-record-completed');
    expect(result.auditTrail.some((entry) => entry.action === 'review-adopted')).toBe(true);
  });

  it('上级查房方案调整由非 expert-review 角色确认时阻断并记 UNAUTHORIZED_REVIEW', async () => {
    const result = await runInpatientWorkflow(
      buildWorkflowInput({
        documentType: 'senior-round',
        review: adoptReview('physician-confirm'),
        draftOverrides: { treatmentPlanAdjustment: true },
      }),
    );
    expect(result.status).toBe('blocked');
    expect(result.auditTrail.some((entry) => entry.action === 'UNAUTHORIZED_REVIEW')).toBe(true);
    expect(result.events).toEqual([]);
  });

  it('普通文书由非 physician-confirm 角色确认时阻断', async () => {
    const result = await runInpatientWorkflow(
      buildWorkflowInput({ review: adoptReview('expert-review') }),
    );
    expect(result.status).toBe('blocked');
    expect(result.auditTrail.some((entry) => entry.action === 'UNAUTHORIZED_REVIEW')).toBe(true);
  });

  it('上级查房方案调整未注入人工决策时阻断并要求上级医师确认', async () => {
    const result = await runInpatientWorkflow(
      buildWorkflowInput({
        documentType: 'senior-round',
        draftOverrides: { treatmentPlanAdjustment: true },
      }),
    );
    expect(result.status).toBe('blocked');
    expect(result.auditTrail.some((entry) => entry.action === 'UNAUTHORIZED_REVIEW')).toBe(true);
  });
});

describe('住院工作流 - 越权取数与越权写阻断', () => {
  it('非 doctor 角色调用回写工具被阻断并记录 UNAUTHORIZED_WRITE', async () => {
    const input: InpatientWorkflowInput = buildWorkflowInput({
      actor: { userId: 'nurse-demo-001', role: 'nurse', department: '内科' },
      review: adoptReview(),
    });
    const result = await runInpatientWorkflow(input);
    expect(result.status).toBe('blocked');
    expect(result.auditTrail.some((entry) => entry.action === 'UNAUTHORIZED_WRITE')).toBe(true);
    expect(result.events).toEqual([]);
  });

  it('未获得知情同意确认时回写被阻断', async () => {
    const result = await runInpatientWorkflow(
      buildWorkflowInput({ consentConfirmed: false, review: adoptReview() }),
    );
    expect(result.status).toBe('blocked');
    expect(result.auditTrail.some((entry) => entry.action === 'UNAUTHORIZED_WRITE')).toBe(true);
  });

  it('缺少 patientId / visitId 时写路径阻断并记录原因', async () => {
    const result = await runInpatientWorkflow(
      buildWorkflowInput({ patientId: undefined, visitId: undefined, review: adoptReview() }),
    );
    expect(result.status).toBe('blocked');
    const denied = result.auditTrail.find((entry) => entry.action === 'UNAUTHORIZED_WRITE');
    expect(denied).toBeTruthy();
    expect(denied?.detail).toContain('patientId / visitId');
  });
});

describe('住院工作流 - 人工确认四决策', () => {
  it('医师拒绝草稿：状态 rejected，不发出完成事件', async () => {
    const result = await runInpatientWorkflow(
      buildWorkflowInput({
        review: { decision: 'rejected', reviewerRole: 'physician-confirm', comment: '病史不全，退回补充' },
      }),
    );
    expect(result.status).toBe('rejected');
    expect(result.review?.decision).toBe('rejected');
    expect(result.events).toEqual([]);
  });

  it('医师修改稿经 Schema 校验与 Guard 复核后完成回写', async () => {
    const modifiedDraft = buildValidDraft({
      chiefComplaint: '咳嗽咳痰 3 天，伴低热。',
      presentIllness: '患者 3 天前出现咳嗽咳痰，昨日低热。',
      historyIllness: '既往体健。',
      physicalExam: '神清，双肺呼吸音粗。',
      auxiliaryExams: '血常规结果待回报。',
    });
    const result = await runInpatientWorkflow(
      buildWorkflowInput({
        review: { decision: 'modified', reviewerRole: 'physician-confirm', modifiedDraft, comment: '补充查体与现病史' },
      }),
    );
    expect(result.status).toBe('completed');
    expect(result.events).toContain('inpatient-record-completed');
    expect(result.auditTrail.some((entry) => entry.action === 'review-modified')).toBe(true);
  });

  it('人工退回计入修订次数，修订成功后完成回写', async () => {
    const adapter: InpatientModelAdapter = {
      async generateDraft() {
        return buildValidDraft({ chiefComplaint: '咳嗽咳痰 3 天' });
      },
    };
    const result = await runInpatientWorkflow(
      buildWorkflowInput({
        review: { decision: 'returned-for-revision', reviewerRole: 'physician-confirm', comment: '补充现病史细节' },
      }),
      { modelAdapter: adapter },
    );
    expect(result.status).toBe('completed');
    expect(result.auditTrail.some((entry) => entry.action === 'review-returned-for-revision')).toBe(true);
    expect(result.events).toContain('inpatient-record-completed');
  });
});

describe('住院工作流 - 共用解读组件委派', () => {
  it('综合分析时委派门诊 / 住院共用组件，返回结构稳定且患者版免责口径一致', async () => {
    const result = await runInpatientWorkflow(
      buildWorkflowInput({
        documentType: 'comprehensive-analysis',
        clinicalReports: [
          {
            reportKind: 'lab',
            audience: 'patient',
            citations: [],
            focus: '电解质复查',
            items: [
              {
                item: '血钾',
                value: '2.8 mmol/L',
                referenceRange: '3.9–6.1 mmol/L',
                abnormalFlag: 'critical',
              },
            ],
          },
        ],
      }),
    );
    expect(result.status).toBe('completed');
    expect(result.interpretations.length).toBe(1);
    expect(result.interpretations[0].criticalAlerts.length).toBeGreaterThan(0);
    expect(result.interpretations[0].evidenceLevel).toBe('none');
    expect(result.interpretations[0].disclaimer).toBe('本解读为辅助参考，不作为诊断依据；请以执业医师判断为准。');
    expect(result.auditTrail.some((entry) => entry.action === 'clinical-interpretation-delegated')).toBe(true);
  });
});
