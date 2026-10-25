/**
 * 单元测试 - Sentinel 审批网关三态决策（契约 §8）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import { computeDraftHash } from '../../../src/core/agent/consult/draftHash';
import { newId, nowIso } from '../../../src/core/agent/consult/roleSupport';
import { approveDraft } from '../../../src/core/agent/consult/sentinel/sentinelGateway';
import type { ConsultDraft } from '../../../src/core/agent/consult/types';

/** 构造测试草稿（overrides 用于故意突破红线字面量做拒绝用例） */
function makeDraft(overrides: Record<string, unknown> = {}): ConsultDraft {
  const now = nowIso();
  const base: ConsultDraft = {
    id: newId('draft'),
    threadId: 'thread-test',
    kind: 'diagnosis',
    title: '诊断建议草稿（待执业医师复核）',
    summary: '测试草稿摘要',
    content: '测试草稿正文',
    evidence: [
      { kind: 'knowledge', label: '科普条目', source: '知识库 DEMO 条目', snippet: '演示证据内容' },
    ],
    needsPhysicianReview: true,
    isOutOfHospitalPrescription: false,
    status: 'pending_review',
    draftHash: '',
    reviewerId: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: now,
    updatedAt: now,
  };
  const draft = { ...base, ...overrides } as ConsultDraft;
  draft.draftHash = computeDraftHash(draft);
  return draft;
}

describe('sentinel 审批网关', () => {
  it('证据齐全且红线满足 -> approved，并把哈希写入审批表', () => {
    const approvedHashes = new Map<string, string>();
    const draft = makeDraft();
    const decision = approveDraft(draft, approvedHashes);
    expect(decision.decision).toBe('approved');
    expect(decision.draftHash).toBe(draft.draftHash);
    expect(approvedHashes.has(draft.draftHash)).toBe(true);
  });

  it('同线程同哈希已审批 -> duplicate 并返回既有草稿 ID，不重复审批', () => {
    const approvedHashes = new Map<string, string>();
    const draft = makeDraft();
    approveDraft(draft, approvedHashes);
    const duplicate = approveDraft(draft, approvedHashes);
    expect(duplicate.decision).toBe('duplicate');
    expect(duplicate.existingDraftId).toBe(draft.id);
  });

  it('缺少证据支撑 -> rejected', () => {
    const draft = makeDraft({ evidence: [] });
    const decision = approveDraft(draft, new Map<string, string>());
    expect(decision.decision).toBe('rejected');
    expect(decision.reason).toContain('证据');
  });

  it('安全等级 acute 状态下不产出草稿 -> rejected', () => {
    const draft = makeDraft();
    const decision = approveDraft(draft, new Map<string, string>(), { safetyLevel: 'acute' });
    expect(decision.decision).toBe('rejected');
  });

  it('未强制医师复核（红线突破）-> rejected', () => {
    const draft = makeDraft({ needsPhysicianReview: false });
    const decision = approveDraft(draft, new Map<string, string>());
    expect(decision.decision).toBe('rejected');
  });

  it('被标记为院外处方（红线突破）-> rejected', () => {
    const draft = makeDraft({ isOutOfHospitalPrescription: true });
    const decision = approveDraft(draft, new Map<string, string>());
    expect(decision.decision).toBe('rejected');
  });

  it('状态非 pending_review（红线突破）-> rejected', () => {
    const draft = makeDraft({ status: 'approved' });
    const decision = approveDraft(draft, new Map<string, string>());
    expect(decision.decision).toBe('rejected');
  });
});
