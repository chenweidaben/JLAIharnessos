/**
 * 单元测试 - 咨询编排器补充分支（补基线未覆盖分支）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖基线未覆盖行：
 * - consultOrchestrator.ts 292-307：哨兵驳回分支（不产草稿、落 sentinel_rejected
 *   审计、下发 DRAFT_REJECTED 错误事件、回复常驻免责声明）
 * - consultOrchestrator.ts 343-346：问候等无草稿无追问路径，idle -> collecting
 * 另覆盖 131 行 THREAD_NOT_FOUND 不可达防御分支之外的可达抛错分支。
 * 红线：驳回草稿不入库；急症旁路不产草稿（既有 orchestrator.test.ts 已锁定，
 * 本分片不重复，仅在新路径上继续断言不出现 draft 事件）。
 */

import { describe, expect, it } from 'bun:test';

import {
  handleConsultMessage,
  type OrchestratorContext,
} from '../../../src/core/agent/consult/consultOrchestrator';
import {
  createDemoRuntime,
  type SessionRuntime,
} from '../../../src/core/agent/consult/runtime/sessionRuntime';
import type { SseEvent } from '../../../src/core/agent/consult/types';
import { DISCLAIMER } from '../../../src/core/agent/consult/types';
import { makeOrchestratorContext, TEST_USER_ID } from './helpers';

interface SetupFixture {
  threadId: string;
  ctx: OrchestratorContext;
  runtime: SessionRuntime;
}

async function setupFixture(): Promise<SetupFixture> {
  const runtime = createDemoRuntime();
  const thread = runtime.createThread({ userId: TEST_USER_ID, title: '编排器分支测试会话' });
  const ctx = await makeOrchestratorContext(runtime);
  return { threadId: thread.id, ctx, runtime };
}

function eventTypes(events: SseEvent[]): string[] {
  return events.map((event) => event.type);
}

describe('consultOrchestrator 哨兵驳回分支（基线 292-307 行）', () => {
  it('证据不足的草稿被哨兵驳回：不产草稿、不落库、落 sentinel_rejected 审计并下发错误事件', async () => {
    const fixture = await setupFixture();
    const result = await handleConsultMessage(
      fixture.threadId,
      '我最近总是心慌，感觉不舒服，想咨询一下',
      fixture.ctx,
    );

    // 红线：驳回即无草稿，线程保持 idle，当前角色被清空
    expect(result.draft).toBeNull();
    expect(result.thread.status).toBe('idle');
    expect(result.thread.currentRole).toBeNull();
    expect(result.message.roleKind).toBe('doctor');

    // 审计落痕：system 角色落 sentinel_rejected，携带草稿哈希与驳回原因
    const rejectAudit = result.audit.find((entry) => entry.action === 'sentinel_rejected');
    expect(rejectAudit).not.toBeNull();
    expect(rejectAudit?.actorRole).toBe('system');
    expect(rejectAudit?.traceId).toBe(fixture.ctx.traceId);
    expect(rejectAudit?.detail.reason).toBe('缺少证据支撑，不予审批。');
    expect(typeof rejectAudit?.detail.draftHash).toBe('string');
    expect(rejectAudit?.detail.draftHash).toHaveLength(64);

    // SSE 错误事件：code=DRAFT_REJECTED，消息为驳回原因；全程不出现 draft 事件
    const errorEvent = result.events.find((event) => event.type === 'error');
    expect(errorEvent?.type).toBe('error');
    if (errorEvent?.type === 'error') {
      expect(errorEvent.code).toBe('DRAFT_REJECTED');
      expect(errorEvent.message).toBe('缺少证据支撑，不予审批。');
    }
    expect(eventTypes(result.events)).not.toContain('draft');

    // 回复末尾常驻免责声明，并提示草稿未通过安全校验
    expect(result.message.content).toContain('草稿未通过安全校验');
    expect(result.message.content).toContain(DISCLAIMER);

    // 驳回草稿不得持久化到仓储
    const persisted = await fixture.runtime.listDrafts(fixture.threadId, 'diagnosis');
    expect(persisted).toEqual([]);
  });
});

describe('consultOrchestrator 问候收集态分支（基线 343-346 行）', () => {
  it('问候意图：supervisor 不转角色、不产草稿，线程由 idle 进入 collecting', async () => {
    const fixture = await setupFixture();
    const result = await handleConsultMessage(fixture.threadId, '你好', fixture.ctx);

    expect(result.thread.status).toBe('collecting');
    expect(result.thread.currentRole).toBe('supervisor');
    expect(result.draft).toBeNull();
    expect(result.message.intent).toBe('greeting');
    expect(result.message.roleKind).toBe('supervisor');
    expect(result.message.content).toContain(DISCLAIMER);
    expect(result.message.content).toContain('120');

    const types = eventTypes(result.events);
    expect(types).toContain('delta');
    expect(types).toContain('disclaimer');
    expect(types).toContain('meta');
    expect(types).toContain('done');
    expect(types).not.toContain('draft');
    expect(types).not.toContain('tool');
  });
});

describe('consultOrchestrator 未知线程抛错（131 行可达分支）', () => {
  it('线程不存在时抛出 THREAD_NOT_FOUND，不写入任何消息 / 草稿 / 审计', async () => {
    const fixture = await setupFixture();
    let threadNotFound = false;
    try {
      await handleConsultMessage('thread-not-exist-404', '你好', fixture.ctx);
    } catch (error) {
      threadNotFound = error instanceof Error && error.message === 'THREAD_NOT_FOUND';
    }
    expect(threadNotFound).toBe(true);

    const runtime = fixture.runtime;
    expect(await runtime.listMessages('thread-not-exist-404')).toEqual([]);
    expect(await runtime.listAudit('thread-not-exist-404')).toEqual([]);
  });
});
