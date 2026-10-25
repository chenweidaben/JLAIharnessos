/**
 * 单元测试 - 草稿稳定字段哈希（契约 §8）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import { computeDraftHash, extractStableFields } from '../../../src/core/agent/consult/draftHash';
import { newId, nowIso } from '../../../src/core/agent/consult/roleSupport';
import type { ConsultDraft } from '../../../src/core/agent/consult/types';

function makeDraft(overrides: Partial<ConsultDraft> = {}): ConsultDraft {
  const now = nowIso();
  return {
    id: newId('draft'),
    threadId: 'thread-test',
    kind: 'diagnosis',
    title: '诊断建议草稿（待执业医师复核）',
    summary: '头痛伴咳嗽待排查',
    content: '建议排查上呼吸道感染相关常见病因，待医师复核。',
    evidence: [
      {
        kind: 'knowledge',
        label: '普通感冒科普',
        source: '知识库 DEMO 条目',
        snippet: '普通感冒多由病毒引起。',
      },
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
    ...overrides,
  };
}

describe('draftHash 稳定字段哈希', () => {
  it('相同稳定业务字段计算出相同哈希', () => {
    const first = makeDraft();
    const second = makeDraft();
    expect(computeDraftHash(first)).toBe(computeDraftHash(second));
  });

  it('易变字段（id / 状态 / 时间戳 / 审核人 / 审核备注）不影响哈希', () => {
    const first = makeDraft();
    const second = makeDraft({
      id: newId('draft'),
      reviewerId: 'doctor-001',
      reviewedAt: nowIso(),
      reviewNote: '建议补充检查',
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      updatedAt: nowIso(),
    });
    expect(computeDraftHash(first)).toBe(computeDraftHash(second));
  });

  it('正文内容变化导致哈希不同', () => {
    const first = makeDraft();
    const second = makeDraft({ content: '另一组完全不同的临床描述与建议方向。' });
    expect(computeDraftHash(first)).not.toBe(computeDraftHash(second));
  });

  it('证据条目顺序交换不影响哈希（规范化排序）', () => {
    const first = makeDraft({
      evidence: [
        { kind: 'knowledge', label: '条目甲', source: '知识库', snippet: '甲内容' },
        { kind: 'history', label: '既往史', source: '画像', snippet: '高血压' },
      ],
    });
    const second = makeDraft({
      evidence: [
        { kind: 'history', label: '既往史', source: '画像', snippet: '高血压' },
        { kind: 'knowledge', label: '条目甲', source: '知识库', snippet: '甲内容' },
      ],
    });
    expect(computeDraftHash(first)).toBe(computeDraftHash(second));
  });

  it('空白排版差异不影响哈希', () => {
    const first = makeDraft({ title: '诊断建议草稿（待执业医师复核）' });
    const second = makeDraft({
      title: '  诊断建议草稿（待执业医师复核）  ',
      content: '建议排查上呼吸道感染相关常见病因，   待医师复核。',
    });
    expect(computeDraftHash(first)).toBe(computeDraftHash(second));
  });

  it('extractStableFields 剔除易变字段', () => {
    const draft = makeDraft({ reviewerId: 'doctor-002', reviewedAt: nowIso(), reviewNote: '备注' });
    const stable = extractStableFields(draft);
    expect(Object.keys(stable).sort()).toEqual([
      'content',
      'evidence',
      'isOutOfHospitalPrescription',
      'kind',
      'needsPhysicianReview',
      'summary',
      'title',
    ]);
  });
});
