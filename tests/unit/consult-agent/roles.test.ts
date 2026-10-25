/**
 * 单元测试 - 四角色：Supervisor 分诊 / Examiner 追问 / Doctor 诊断草稿 / Pharmacist 处方草稿
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import { createSafeLlm } from '../../../src/core/agent/consult/llm/safeLlm';
import {
  DoctorRole,
  ExaminerRole,
  PharmacistRole,
  SupervisorRole,
} from '../../../src/core/agent/consult/roles';
import { DISCLAIMER } from '../../../src/core/agent/consult/types';
import { makeRoleInput, TEST_TRACE_ID } from './helpers';

describe('SupervisorRole 分诊主管', () => {
  const supervisor = new SupervisorRole(createSafeLlm());

  it('用药问题分诊到药师角色，不产草稿，审计透传 traceId', async () => {
    const output = await supervisor.handle(
      makeRoleInput({ intent: 'medication_question', userText: '这个药能不能和降压药一起吃？' }),
    );
    expect(output.nextRole).toBe('pharmacist');
    expect(output.draft).toBeNull();
    expect(output.reply).toContain(DISCLAIMER);
    expect(output.audit[0].actorRole).toBe('supervisor');
    expect(output.audit[0].traceId).toBe(TEST_TRACE_ID);
    expect(output.degradedLlm).toBe(true);
  });

  it('问候不切换角色并给出急症提示引导', async () => {
    const output = await supervisor.handle(makeRoleInput({ intent: 'greeting', userText: '你好' }));
    expect(output.nextRole).toBeNull();
    expect(output.reply).toContain('120');
    expect(output.reply).toContain(DISCLAIMER);
  });

  it('信息不足的症状主诉分诊到追问角色', async () => {
    const output = await supervisor.handle(
      makeRoleInput({ intent: 'symptom_report', userText: '我难受' }),
    );
    expect(output.nextRole).toBe('examiner');
  });
});

describe('ExaminerRole 问诊追问', () => {
  const examiner = new ExaminerRole(createSafeLlm());

  it('输出 2–4 个结构化追问，不产草稿、不切换角色', async () => {
    const output = await examiner.handle(
      makeRoleInput({ intent: 'symptom_report', userText: '我难受' }),
    );
    expect(output.followUpQuestions.length).toBeGreaterThanOrEqual(2);
    expect(output.followUpQuestions.length).toBeLessThanOrEqual(4);
    expect(output.draft).toBeNull();
    expect(output.nextRole).toBeNull();
    expect(output.reply).toContain(DISCLAIMER);
    expect(output.audit[0].actorRole).toBe('examiner');
    expect(output.audit[0].traceId).toBe(TEST_TRACE_ID);
  });

  it('用药咨询场景给出药品相关追问', async () => {
    const output = await examiner.handle(
      makeRoleInput({ intent: 'medication_question', userText: '我想咨询用药' }),
    );
    expect(output.followUpQuestions.some((question) => question.includes('药品'))).toBe(true);
  });
});

describe('DoctorRole 医师角色', () => {
  const doctor = new DoctorRole(createSafeLlm());

  it('生成诊断建议草稿并遵守红线字面量', async () => {
    const output = await doctor.handle(
      makeRoleInput({ intent: 'symptom_report', userText: '我头痛三天了，有点咳嗽和乏力' }),
    );
    expect(output.draft).not.toBeNull();
    const draft = output.draft;
    if (!draft) {
      throw new Error('诊断草稿缺失');
    }
    expect(draft.kind).toBe('diagnosis');
    expect(draft.needsPhysicianReview).toBe(true);
    expect(draft.isOutOfHospitalPrescription).toBe(false);
    expect(draft.status).toBe('pending_review');
    expect(draft.draftHash).toHaveLength(64);
    expect(draft.evidence.length).toBeGreaterThan(0);
    expect(draft.content).toContain(DISCLAIMER);
    expect(draft.content).toContain('待复核');
    expect(draft.content).toContain('不构成确诊结论');
    expect(output.reply).toContain(DISCLAIMER);

    const doctorAudit = output.audit.find((entry) => entry.action === 'doctor_draft');
    expect(doctorAudit?.actorRole).toBe('doctor');
    expect(doctorAudit?.traceId).toBe(TEST_TRACE_ID);
    expect(output.audit.some((entry) => entry.toolName === 'searchKnowledgeBase')).toBe(true);
    expect(output.degradedLlm).toBe(true);
  });
});

describe('PharmacistRole 药师角色', () => {
  const pharmacist = new PharmacistRole(createSafeLlm());

  it('生成用药建议草稿并遵守院外处方 / 在院医嘱红线', async () => {
    const output = await pharmacist.handle(
      makeRoleInput({ intent: 'medication_question', userText: '布洛芬怎么吃，有没有注意事项？' }),
    );
    expect(output.draft).not.toBeNull();
    const draft = output.draft;
    if (!draft) {
      throw new Error('用药草稿缺失');
    }
    expect(draft.kind).toBe('prescription');
    expect(draft.needsPhysicianReview).toBe(true);
    expect(draft.isOutOfHospitalPrescription).toBe(false);
    expect(draft.status).toBe('pending_review');
    expect(draft.evidence.some((entry) => entry.kind === 'drug')).toBe(true);
    expect(draft.content).toContain('在院医嘱');
    expect(draft.content).toContain(DISCLAIMER);
    expect(output.reply).toContain(DISCLAIMER);

    const pharmacistAudit = output.audit.find((entry) => entry.action === 'pharmacist_draft');
    expect(pharmacistAudit?.actorRole).toBe('pharmacist');
    expect(pharmacistAudit?.traceId).toBe(TEST_TRACE_ID);
    expect(output.audit.some((entry) => entry.toolName === 'lookupDrug')).toBe(true);
  });
});
