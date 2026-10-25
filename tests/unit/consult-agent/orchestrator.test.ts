/**
 * 单元测试 - 咨询编排器主流程（契约 §10）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * DEMO_MODE=1，进程内运行时短路，不连库、不联网。
 */

import { describe, expect, it } from 'bun:test';

import type { OrchestratorContext } from '../../../src/core/agent/consult/consultOrchestrator';
import { handleConsultMessage } from '../../../src/core/agent/consult/consultOrchestrator';
import {
  createDemoRuntime,
  type SessionRuntime,
} from '../../../src/core/agent/consult/runtime/sessionRuntime';
import type { SseEvent } from '../../../src/core/agent/consult/types';
import { ACUTE_GUIDANCE, DISCLAIMER } from '../../../src/core/agent/consult/types';
import { makeOrchestratorContext, TEST_USER_ID } from './helpers';

interface SetupFixture {
  threadId: string;
  ctx: OrchestratorContext;
  runtime: SessionRuntime;
}

async function setupFixture(): Promise<SetupFixture> {
  const runtime = createDemoRuntime();
  const thread = runtime.createThread({ userId: TEST_USER_ID, title: '编排器测试会话' });
  const ctx = await makeOrchestratorContext(runtime);
  return { threadId: thread.id, ctx, runtime };
}

function eventTypes(events: SseEvent[]): string[] {
  return events.map((event) => event.type);
}

describe('consultOrchestrator 编排器', () => {
  it('普通问诊：信息充分 -> 医师草稿 -> review_pending，事件序列完整', async () => {
    const fixture = await setupFixture();
    const result = await handleConsultMessage(
      fixture.threadId,
      '我头痛三天了，有点咳嗽和乏力，症状比较明显',
      fixture.ctx,
    );

    expect(result.thread.status).toBe('review_pending');
    expect(result.draft?.kind).toBe('diagnosis');
    expect(result.message.role).toBe('assistant');
    expect(result.message.roleKind).toBe('doctor');
    expect(result.message.disclaimer).toBe(DISCLAIMER);
    expect(result.message.toolCalls?.length).toBeGreaterThan(0);
    expect(eventTypes(result.events)).toContain('delta');
    expect(eventTypes(result.events)).toContain('tool');
    expect(eventTypes(result.events)).toContain('draft');
    expect(eventTypes(result.events)).toContain('disclaimer');
    expect(eventTypes(result.events)).toContain('meta');
    expect(eventTypes(result.events)).toContain('done');
    expect(result.audit.length).toBeGreaterThan(0);
  });

  it('急症旁路：优先于角色编排，状态 escalated，不产草稿，下发 safety:acute 事件', async () => {
    const fixture = await setupFixture();
    const result = await handleConsultMessage(
      fixture.threadId,
      '我胸痛伴大汗，呼吸困难，意识不清',
      fixture.ctx,
    );

    expect(result.thread.status).toBe('escalated');
    expect(result.draft).toBeNull();
    expect(result.message.content).toBe(ACUTE_GUIDANCE);
    expect(result.message.safetyLevel).toBe('acute');
    expect(result.audit[0].action).toBe('acute_bypass');
    expect(result.audit[0].actorRole).toBe('system');

    const acuteEvent = result.events.find((event) => event.type === 'safety:acute');
    expect(acuteEvent).not.toBeNull();
    if (acuteEvent?.type === 'safety:acute') {
      expect(acuteEvent.matched.length).toBeGreaterThan(0);
      expect(acuteEvent.guidance).toBe(ACUTE_GUIDANCE);
    }
    expect(eventTypes(result.events)).not.toContain('draft');
  });

  it('退出意图：关闭线程，返回退出确认，不产草稿', async () => {
    const fixture = await setupFixture();
    const result = await handleConsultMessage(fixture.threadId, '再见，我要退出会话', fixture.ctx);

    expect(result.thread.status).toBe('closed');
    expect(result.thread.closedAt).not.toBeNull();
    expect(result.draft).toBeNull();
    expect(result.message.intent).toBe('exit');
    expect(result.audit.some((entry) => entry.action === 'thread_exit')).toBe(true);
    expect(result.audit.some((entry) => entry.action === 'thread_closed')).toBe(true);
    expect(eventTypes(result.events)).toContain('done');
  });

  it('哨兵去重：同一业务草稿二次提交命中 duplicate，不重复落库', async () => {
    const fixture = await setupFixture();
    const text = '我头痛三天了，有点咳嗽和乏力，症状比较明显';

    const first = await handleConsultMessage(fixture.threadId, text, fixture.ctx);
    expect(first.draft?.kind).toBe('diagnosis');
    const firstDraftId = first.draft?.id;

    const second = await handleConsultMessage(fixture.threadId, text, fixture.ctx);
    expect(second.draft?.id).toBe(firstDraftId);
    expect(second.audit.some((entry) => entry.action === 'sentinel_duplicate')).toBe(true);

    const persisted = await fixture.runtime.listDrafts(fixture.threadId, 'diagnosis');
    expect(persisted.length).toBe(1);
  });

  it('信息不足：Supervisor 转 Examiner 追问，状态 clarifying，不产草稿', async () => {
    const fixture = await setupFixture();
    const result = await handleConsultMessage(fixture.threadId, '我难受', fixture.ctx);

    expect(result.thread.status).toBe('clarifying');
    expect(result.draft).toBeNull();
    expect(result.message.roleKind).toBe('examiner');
    expect(result.message.content).toContain(DISCLAIMER);
  });

  it('终态线程拒绝新消息并抛出错误', async () => {
    const fixture = await setupFixture();
    await handleConsultMessage(fixture.threadId, '再见，退出会话', fixture.ctx);
    let closedRejected = false;
    try {
      await handleConsultMessage(fixture.threadId, '我又头晕了', fixture.ctx);
    } catch (error) {
      closedRejected = error instanceof Error && error.message === 'THREAD_CLOSED';
    }
    expect(closedRejected).toBe(true);
  });

  it('工具审计只保留脱敏摘要，不记录原始入参明文', async () => {
    const fixture = await setupFixture();
    const result = await handleConsultMessage(
      fixture.threadId,
      '我头痛三天了，有点咳嗽和乏力，症状比较明显',
      fixture.ctx,
    );
    for (const entry of result.audit) {
      const serialized = JSON.stringify(entry.detail);
      expect(serialized).not.toContain('rawArgs');
      expect(serialized).not.toContain('原始入参');
      expect(entry.traceId).toBeTruthy();
    }
  });

  it('画像事实随本轮对话合并并持久化到运行时', async () => {
    const fixture = await setupFixture();
    await handleConsultMessage(fixture.threadId, '我青霉素过敏，有高血压，头痛三天了', fixture.ctx);
    const profile = await fixture.runtime.getProfile(TEST_USER_ID);
    expect(profile.facts.some((fact) => fact.key === 'allergy')).toBe(true);
    expect(profile.facts.some((fact) => fact.key === 'chronic_condition')).toBe(true);
  });
});
