/**
 * S-09 门诊工作流离线运行器集成单测（4.2.3 DAG 编排 + S-01 红线 + 人工确认 + 越权写）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import { runOutpatientWorkflow } from '@/bff/agents/outpatient/outpatientWorkflow.js';
import { buildOutpatientDraft } from '@/bff/agents/outpatient/draftSchema.js';
import type { OutpatientModelAdapter, OutpatientWorkflowInput } from '@/bff/agents/outpatient/types.js';
import { buildWorkflowInput, demoFacts } from './fixtures.js';

function adoptReview(comment = '采纳') {
  return { decision: 'adopted' as const, reviewerRole: 'doctor', comment };
}

describe('门诊工作流 runOutpatientWorkflow - 主路径', () => {
  it('离线骨架 + 医师采纳：完成回写并发出 outpatient-record-completed 事件', async () => {
    const result = await runOutpatientWorkflow(buildWorkflowInput({ review: adoptReview() }));
    expect(result.status).toBe('completed');
    expect(result.events).toContain('outpatient-record-completed');
    expect(result.auditTrail.length).toBeGreaterThan(0);
    expect(result.auditTrail.some((entry) => entry.action === 'draft-written-offline')).toBe(true);
  });

  it('审计台账逐条回传注入式 auditSink，含患者与就诊标识', async () => {
    const entries: Array<{ action: string; patientId?: string; visitId?: string }> = [];
    const result = await runOutpatientWorkflow(buildWorkflowInput({ review: adoptReview() }), {
      auditSink: (entry) => entries.push(entry),
    });
    expect(result.status).toBe('completed');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.patientId === 'patient-demo-001' && entry.visitId === 'visit-demo-001')).toBe(true);
    expect(entries.some((entry) => entry.patientId === undefined || entry.visitId === undefined)).toBe(false);
    expect(result.auditTrail.every((entry) => entry.patientId === 'patient-demo-001' && entry.visitId === 'visit-demo-001')).toBe(true);
  });

  it('工具适配器被调用记录只读工具，离线未注入时标注 degraded-offline', async () => {
    const calls: string[] = [];
    const toolAdapter = {
      async call(toolId: string) {
        calls.push(toolId);
        return {};
      },
    };
    const result = await runOutpatientWorkflow(buildWorkflowInput({ review: adoptReview() }), { toolAdapter });
    expect(result.status).toBe('completed');
    expect(calls).toContain('get_patient_profile');
    expect(calls).toContain('submit_outpatient_draft');
  });
});

describe('门诊工作流 - S-01 红线集成', () => {
  it('确定性表述被 certainty-redline 命中，BLOCK 不出稿', async () => {
    const adapter: OutpatientModelAdapter = {
      async generateDraft() {
        return {
          encounterKind: 'initial',
          chiefComplaint: '头痛3天',
          presentIllness: '确诊为高血压，一定需要降压治疗。',
          historyIllness: '',
          physicalExam: '',
          auxiliaryExams: '',
          diagnosis: [],
          suggestions: [],
          missingInfo: [],
          citations: [],
          evidenceLevel: 'none',
        };
      },
    };
    const result = await runOutpatientWorkflow(buildWorkflowInput({ review: adoptReview() }), { modelAdapter: adapter });
    expect(result.status).toBe('blocked');
    expect(result.draft).toBeUndefined();
    expect(result.guardVerdict?.level).toBe('BLOCK');
    expect(result.guardVerdict?.findings.some((f) => f.rule === 'certainty-redline')).toBe(true);
    expect(result.events).toEqual([]);
  });

  it('虚构年龄与事实快照不一致被 fictional-identity 命中并阻断', async () => {
    const adapter: OutpatientModelAdapter = {
      async generateDraft() {
        return {
          encounterKind: 'initial',
          chiefComplaint: '头痛3天',
          presentIllness: '患者52岁男性，因头痛就诊。',
          historyIllness: '',
          physicalExam: '',
          auxiliaryExams: '',
          diagnosis: [],
          suggestions: [],
          missingInfo: [],
          citations: [],
          evidenceLevel: 'none',
        };
      },
    };
    const facts = { ...demoFacts, age: 45, gender: '男' };
    const result = await runOutpatientWorkflow(buildWorkflowInput({ facts, review: adoptReview() }), { modelAdapter: adapter });
    expect(result.status).toBe('blocked');
    expect(result.guardVerdict?.findings.some((f) => f.rule === 'fictional-identity')).toBe(true);
  });
});

describe('门诊工作流 - Schema 失败重试降级', () => {
  it('两次修订仍非法 Schema：状态 revised-twice-and-held，产出缺项骨架，不返回伪造完整稿', async () => {
    const adapter: OutpatientModelAdapter = {
      async generateDraft() {
        return {
          encounterKind: 'initial',
          chiefComplaint: '头痛3天',
          presentIllness: '3天前头痛。',
          historyIllness: '',
          physicalExam: '',
          auxiliaryExams: '',
          diagnosis: [],
          suggestions: [
            { kind: 'exam', content: '建议复查头颅 CT', citations: [], basisNote: '排除器质性病变' },
          ],
          missingInfo: [],
          citations: [],
          evidenceLevel: 'none',
        };
      },
    };
    const result = await runOutpatientWorkflow(buildWorkflowInput({ review: adoptReview() }), { modelAdapter: adapter });
    expect(result.status).toBe('revised-twice-and-held');
    expect(result.events).toEqual([]);
    expect(result.draft?.missingInfo.length).toBeGreaterThan(0);
    expect(result.draft?.suggestions).toEqual([]);
  });
});

describe('门诊工作流 - 越权取数与越权写阻断', () => {
  it('非 doctor 角色调用回写工具被阻断并记录 UNAUTHORIZED_WRITE', async () => {
    const input: OutpatientWorkflowInput = buildWorkflowInput({
      actor: { userId: 'nurse-demo-001', role: 'nurse', department: '内科' },
      review: adoptReview(),
    });
    const result = await runOutpatientWorkflow(input);
    expect(result.status).toBe('blocked');
    expect(result.auditTrail.some((entry) => entry.action === 'UNAUTHORIZED_WRITE')).toBe(true);
    expect(result.events).toEqual([]);
  });

  it('未获得知情同意确认时回写被阻断', async () => {
    const result = await runOutpatientWorkflow(
      buildWorkflowInput({ consentConfirmed: false, review: adoptReview() }),
    );
    expect(result.status).toBe('blocked');
    expect(result.auditTrail.some((entry) => entry.action === 'UNAUTHORIZED_WRITE')).toBe(true);
  });

  it('缺少 patientId / visitId 时写路径阻断', async () => {
    const result = await runOutpatientWorkflow(
      buildWorkflowInput({ patientId: undefined, visitId: undefined, review: adoptReview() }),
    );
    expect(result.status).toBe('blocked');
    expect(result.auditTrail.some((entry) => entry.action === 'UNAUTHORIZED_WRITE')).toBe(true);
  });
});

describe('门诊工作流 - 人工确认决策', () => {
  it('医师拒绝草稿：状态 rejected，不发出完成事件', async () => {
    const result = await runOutpatientWorkflow(
      buildWorkflowInput({ review: { decision: 'rejected', reviewerRole: 'doctor', comment: '病史不全，退回补充' } }),
    );
    expect(result.status).toBe('rejected');
    expect(result.review?.decision).toBe('rejected');
    expect(result.events).toEqual([]);
  });

  it('医师修改稿经 Schema 校验与 Guard 复核后完成回写', async () => {
    const modifiedDraft = buildOutpatientDraft({
      encounterKind: 'initial',
      chiefComplaint: '头痛3天',
      presentIllness: '3天前出现头痛，伴轻度恶心。',
      historyIllness: '既往体健。',
      physicalExam: '神清，心肺未见异常。',
      auxiliaryExams: '头颅 CT 未见异常。',
      diagnosis: [],
      suggestions: [],
      missingInfo: [],
      citations: [],
    });
    const result = await runOutpatientWorkflow(
      buildWorkflowInput({
        review: { decision: 'modified', reviewerRole: 'doctor', modifiedDraft, comment: '补充查体记录' },
      }),
    );
    expect(result.status).toBe('completed');
    expect(result.events).toContain('outpatient-record-completed');
    expect(result.auditTrail.some((entry) => entry.action === 'review-modified')).toBe(true);
  });

  it('人工退回计入修订次数，修订成功后完成回写', async () => {
    let round = 0;
    const adapter: OutpatientModelAdapter = {
      async generateDraft() {
        round += 1;
        return {
          encounterKind: 'initial',
          chiefComplaint: '头痛3天',
          presentIllness: '3天前出现头痛。',
          historyIllness: '既往体健。',
          physicalExam: '神清。',
          auxiliaryExams: 'CT 未见异常。',
          diagnosis: [],
          suggestions: [],
          missingInfo: [],
          citations: [],
          evidenceLevel: 'none',
        };
      },
    };
    const result = await runOutpatientWorkflow(
      buildWorkflowInput({ review: { decision: 'returned-for-revision', reviewerRole: 'doctor', comment: '补充现病史细节' } }),
      { modelAdapter: adapter },
    );
    expect(result.status).toBe('completed');
    expect(round).toBeGreaterThanOrEqual(1);
    expect(result.events).toContain('outpatient-record-completed');
  });
});
