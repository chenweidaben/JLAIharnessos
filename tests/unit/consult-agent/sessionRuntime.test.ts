/**
 * 单元测试 - DEMO 进程内会话运行时（补基线未覆盖分支）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖基线未覆盖行：
 * - sessionRuntime.ts 27：isDemoMode 环境判定
 * - sessionRuntime.ts 141：saveProfile 回写并返回画像本体
 * - sessionRuntime.ts 147：listDocuments 空线程 / 已存文档读取
 * - sessionRuntime.ts 151-153：saveDocument 入表并返回文档本体
 * - sessionRuntime.ts 160-161：saveCheckpoint 写入短期记忆快照
 * - sessionRuntime.ts 165-166：getCheckpoint 命中 / 缺失双分支
 * - sessionRuntime.ts 170-177：clear 清空全部七类内存数据
 */

import { afterEach, describe, expect, it } from 'bun:test';

import { createProfileMemory } from '../../../src/core/agent/consult/memory/profileMemory';
import { checkpoint } from '../../../src/core/agent/consult/memory/shortTermMemory';
import { nowIso } from '../../../src/core/agent/consult/roleSupport';
import {
  createDemoRuntime,
  isDemoMode,
  type SessionRuntime,
} from '../../../src/core/agent/consult/runtime/sessionRuntime';
import type {
  ConsultDocument,
  ConsultDraft,
  ConsultMessage,
} from '../../../src/core/agent/consult/types';
import { makeMessage, TEST_USER_ID } from './helpers';

const ORIGINAL_DEMO_MODE = process.env.DEMO_MODE;

afterEach(() => {
  if (ORIGINAL_DEMO_MODE === undefined) {
    delete process.env.DEMO_MODE;
  } else {
    process.env.DEMO_MODE = ORIGINAL_DEMO_MODE;
  }
});

function makeDocument(threadId: string): ConsultDocument {
  return {
    id: 'doc-test-001',
    threadId,
    messageId: null,
    fileName: 'blood-report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    evidenceSummary: null,
    extractedEvidence: [],
    createdAt: nowIso(),
  };
}

function makeDraft(threadId: string): ConsultDraft {
  return {
    id: 'draft-test-001',
    threadId,
    kind: 'diagnosis',
    title: '诊断建议草稿（待执业医师复核）',
    summary: '测试草稿摘要',
    content: '测试草稿正文',
    evidence: [],
    needsPhysicianReview: true,
    isOutOfHospitalPrescription: false,
    status: 'pending_review',
    draftHash: '0'.repeat(64),
    reviewerId: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

describe('sessionRuntime isDemoMode（基线 27 行）', () => {
  it('DEMO_MODE=1 时判定为演示模式', () => {
    process.env.DEMO_MODE = '1';
    expect(isDemoMode()).toBe(true);
  });

  it('DEMO_MODE=0 或未设置时判定为非演示模式', () => {
    process.env.DEMO_MODE = '0';
    expect(isDemoMode()).toBe(false);

    delete process.env.DEMO_MODE;
    expect(isDemoMode()).toBe(false);
  });
});

describe('sessionRuntime 画像持久化（基线 141 行）', () => {
  it('saveProfile 返回同一画像本体，getProfile 可读回已合并事实', async () => {
    const runtime: SessionRuntime = createDemoRuntime();
    const profile = createProfileMemory(TEST_USER_ID);
    profile.facts = [
      {
        key: 'allergy',
        value: '对青霉素过敏（待医师核实）',
        source: 'thread-x',
        updatedAt: nowIso(),
      },
    ];

    const saved = await runtime.saveProfile(profile);
    expect(saved).toBe(profile);

    const loaded = await runtime.getProfile(TEST_USER_ID);
    expect(loaded.userId).toBe(TEST_USER_ID);
    expect(loaded.facts).toHaveLength(1);
    expect(loaded.facts[0]?.key).toBe('allergy');
  });
});

describe('sessionRuntime 文档读写（基线 147、151-153 行）', () => {
  it('空线程 listDocuments 返回空数组；saveDocument 后读回完整文档', async () => {
    const runtime: SessionRuntime = createDemoRuntime();
    const thread = runtime.createThread({ userId: TEST_USER_ID });

    expect(await runtime.listDocuments(thread.id)).toEqual([]);

    const document = makeDocument(thread.id);
    const saved = await runtime.saveDocument(document);

    expect(saved).toBe(document);
    const documents = await runtime.listDocuments(thread.id);
    expect(documents).toHaveLength(1);
    expect(documents[0]?.fileName).toBe('blood-report.pdf');
    expect(documents[0]?.mimeType).toBe('application/pdf');
  });

  it('listDocuments 返回副本，修改返回数组不影响内部存储', async () => {
    const runtime: SessionRuntime = createDemoRuntime();
    const thread = runtime.createThread({ userId: TEST_USER_ID });
    await runtime.saveDocument(makeDocument(thread.id));

    const documents = await runtime.listDocuments(thread.id);
    documents.push(makeDocument(thread.id));

    expect(await runtime.listDocuments(thread.id)).toHaveLength(1);
  });
});

describe('sessionRuntime 短期记忆 checkpoint（基线 160-161、165-166 行）', () => {
  it('saveCheckpoint 写入后 getCheckpoint 读回同一快照', () => {
    const runtime: SessionRuntime = createDemoRuntime();
    const thread = runtime.createThread({ userId: TEST_USER_ID });
    const message: ConsultMessage = makeMessage({ threadId: thread.id, content: '第一条消息' });
    const entry = checkpoint(thread.id, [message]);

    runtime.saveCheckpoint(entry);
    const loaded = runtime.getCheckpoint(thread.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.threadId).toBe(thread.id);
    expect(loaded?.messageCount).toBe(1);
    expect(loaded?.messages[0]?.content).toBe('第一条消息');
  });

  it('未写入 checkpoint 的线程 getCheckpoint 返回 null', () => {
    const runtime: SessionRuntime = createDemoRuntime();
    expect(runtime.getCheckpoint('thread-never-written')).toBeNull();
  });
});

describe('sessionRuntime clear 全量清空（基线 170-177 行）', () => {
  it('七类内存数据清空后均回到初始空态，且可新建线程继续使用', async () => {
    const runtime: SessionRuntime = createDemoRuntime();
    const thread = runtime.createThread({ userId: TEST_USER_ID, title: '待清空会话' });
    const message = makeMessage({ threadId: thread.id, content: '待清空消息' });
    const profile = await runtime.getProfile(TEST_USER_ID);
    profile.facts = [
      { key: 'chronic_condition', value: '高血压', source: thread.id, updatedAt: nowIso() },
    ];

    await runtime.saveMessage(message);
    await runtime.saveDraft(makeDraft(thread.id));
    await runtime.saveAudit({
      id: 'audit-x',
      threadId: thread.id,
      actorRole: 'system',
      action: 'system_init',
      toolName: null,
      toolStatus: null,
      durationMs: null,
      evidenceCount: null,
      errorClass: null,
      traceId: 'trace-x',
      detail: {},
      createdAt: nowIso(),
    });
    await runtime.saveProfile(profile);
    await runtime.saveDocument(makeDocument(thread.id));
    runtime.saveCheckpoint(checkpoint(thread.id, [message]));

    runtime.clear();

    expect(await runtime.findThread(thread.id, TEST_USER_ID)).toBeNull();
    expect(await runtime.listMessages(thread.id)).toEqual([]);
    expect(await runtime.listDrafts(thread.id, 'diagnosis')).toEqual([]);
    expect(await runtime.listAudit(thread.id)).toEqual([]);
    expect((await runtime.getProfile(TEST_USER_ID)).facts).toEqual([]);
    expect(await runtime.listDocuments(thread.id)).toEqual([]);
    expect(runtime.getCheckpoint(thread.id)).toBeNull();

    const reborn = runtime.createThread({ userId: TEST_USER_ID });
    expect(reborn.status).toBe('idle');
  });
});
