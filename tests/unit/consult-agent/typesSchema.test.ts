/**
 * 单元测试 - types zod schema 红线字面量校验（契约 §1.3 / §15-3）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import { nowIso } from '../../../src/core/agent/consult/roleSupport';
import type { ConsultDraft } from '../../../src/core/agent/consult/types';
import {
  draftSchema,
  messageSendSchema,
  threadCreateSchema,
  transcribeSchema,
} from '../../../src/core/agent/consult/types';

/** 构造合法草稿用于 schema 基线校验 */
function validDraft(): ConsultDraft {
  return {
    id: 'draft-001',
    threadId: 'thread-001',
    kind: 'diagnosis',
    title: '诊断建议草稿（待执业医师复核）',
    summary: '头痛伴咳嗽待排查',
    content: '建议排查常见病因，待医师复核。',
    evidence: [
      { kind: 'knowledge', label: '科普条目', source: '知识库 DEMO 条目', snippet: '演示证据内容' },
    ],
    needsPhysicianReview: true,
    isOutOfHospitalPrescription: false,
    status: 'pending_review',
    draftHash: 'a'.repeat(64),
    reviewerId: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

describe('draftSchema 草稿红线字面量', () => {
  it('合法草稿通过校验', () => {
    expect(draftSchema.safeParse(validDraft()).success).toBe(true);
  });

  it('needsPhysicianReview=false 被拒绝（红线反例）', () => {
    const invalid = { ...validDraft(), needsPhysicianReview: false };
    expect(draftSchema.safeParse(invalid).success).toBe(false);
  });

  it('isOutOfHospitalPrescription=true 被拒绝（红线反例）', () => {
    const invalid = { ...validDraft(), isOutOfHospitalPrescription: true };
    expect(draftSchema.safeParse(invalid).success).toBe(false);
  });

  it('status=approved 被拒绝（AI 草稿恒为待复核）', () => {
    const invalid = { ...validDraft(), status: 'approved' };
    expect(draftSchema.safeParse(invalid).success).toBe(false);
  });

  it('status=rejected 被拒绝', () => {
    const invalid = { ...validDraft(), status: 'rejected' };
    expect(draftSchema.safeParse(invalid).success).toBe(false);
  });

  it('evidence 为空数组属于业务可通过 schema、哨兵阶段驳回（schema 层不阻断）', () => {
    const draft = { ...validDraft(), evidence: [] };
    expect(draftSchema.safeParse(draft).success).toBe(true);
  });
});

describe('threadCreateSchema 创建会话入参', () => {
  it('合法入参通过：标题可选、patientId 可空', () => {
    expect(threadCreateSchema.safeParse({}).success).toBe(true);
    expect(
      threadCreateSchema.safeParse({ title: '我的咨询', patientId: null, initialMessage: '你好' })
        .success,
    ).toBe(true);
  });

  it('标题超过 120 字符被拒绝', () => {
    expect(threadCreateSchema.safeParse({ title: '长'.repeat(121) }).success).toBe(false);
  });

  it('patientId 非 UUID 被拒绝', () => {
    expect(threadCreateSchema.safeParse({ patientId: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('messageSendSchema 发送消息入参', () => {
  it('非空去空格文本通过', () => {
    expect(messageSendSchema.safeParse({ content: '  我头痛三天了  ' }).success).toBe(true);
  });

  it('空串 / 纯空格被拒绝', () => {
    expect(messageSendSchema.safeParse({ content: '' }).success).toBe(false);
    expect(messageSendSchema.safeParse({ content: '   ' }).success).toBe(false);
  });

  it('超过 4000 字符被拒绝', () => {
    expect(messageSendSchema.safeParse({ content: 'a'.repeat(4001) }).success).toBe(false);
  });
});

describe('transcribeSchema 语音转写入参', () => {
  it('transcript 非空通过', () => {
    expect(transcribeSchema.safeParse({ transcript: '我头晕' }).success).toBe(true);
  });

  it('audioText 非空通过', () => {
    expect(transcribeSchema.safeParse({ audioText: '我头晕' }).success).toBe(true);
  });

  it('两者皆空被拒绝', () => {
    expect(transcribeSchema.safeParse({ transcript: '', audioText: '  ' }).success).toBe(false);
    expect(transcribeSchema.safeParse({}).success).toBe(false);
  });
});
