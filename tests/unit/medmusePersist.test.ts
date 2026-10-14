/**
 * 健澜科技 jlmedaios - MEDMUSE 会话持久化单测
 *
 * 覆盖 medmuseMessageRepo 的纯函数与 DEMO 内存兜底路径：
 *   - normalizeMessageInput 默认值补全
 *   - mapMessageRow 蛇形行 → camelCase 领域对象
 *   - toMessageView 领域对象 → 前端 wire 视图（agent → assistant）
 *   - DEMO 模式 insertMessage / listBySession / markRead 不连 PG、不抛错
 *
 * 注意：本文件不连接 PostgreSQL，仅演示模式内存路径会被触达。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  _resetMedmuseMessageStoreForTest,
  insertMessage,
  isDemoMessageMode,
  listBySession,
  mapMessageRow,
  markRead,
  normalizeMessageInput,
  toMessageView,
  MEDMUSE_DEFAULT_DISCLAIMER,
} from '../../src/db/repositories/medmuseMessageRepo.js';

let savedDemoMode: string | undefined;

beforeEach(() => {
  savedDemoMode = process.env.DEMO_MODE;
  delete process.env.DEMO_MODE;
  _resetMedmuseMessageStoreForTest();
});

afterEach(() => {
  if (savedDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = savedDemoMode;
  _resetMedmuseMessageStoreForTest();
});

describe('isDemoMessageMode', () => {
  it('未设置时为 false', () => {
    expect(isDemoMessageMode()).toBe(false);
  });
  it('DEMO_MODE=1 或 true 时为 true', () => {
    process.env.DEMO_MODE = '1';
    expect(isDemoMessageMode()).toBe(true);
    process.env.DEMO_MODE = 'true';
    expect(isDemoMessageMode()).toBe(true);
  });
  it('其他取值（如 yes）不视为演示模式', () => {
    process.env.DEMO_MODE = 'yes';
    expect(isDemoMessageMode()).toBe(false);
  });
});

describe('normalizeMessageInput', () => {
  it('补齐全部默认值', () => {
    const n = normalizeMessageInput({ sessionId: 's1', role: 'user', content: '你好' });
    expect(n).toEqual({
      sessionId: 's1',
      role: 'user',
      content: '你好',
      toolCalls: [],
      toolResult: null,
      confidence: 'medium',
      disclaimer: MEDMUSE_DEFAULT_DISCLAIMER,
      systemPromptVersion: '1.0',
      idempotencyKey: null,
    });
  });
  it('显式值不被默认值覆盖', () => {
    const n = normalizeMessageInput({
      sessionId: 's2',
      role: 'agent',
      content: '建议如下',
      toolCalls: [{ name: 'listMyPatients' }],
      toolResult: { ok: true },
      confidence: 'high',
      disclaimer: '自定义免责',
      systemPromptVersion: '2.1',
      idempotencyKey: 'key-123',
    });
    expect(n.confidence).toBe('high');
    expect(n.toolResult).toEqual({ ok: true });
    expect(n.idempotencyKey).toBe('key-123');
    expect(n.systemPromptVersion).toBe('2.1');
  });
});

describe('mapMessageRow', () => {
  it('蛇形行映射为 camelCase 领域对象', () => {
    const m = mapMessageRow({
      id: 'msg-1',
      session_id: 'sess-1',
      role: 'agent',
      content: '建议复查',
      tool_calls: [{ name: 'getVisitDetail' }],
      tool_result: null,
      confidence: 'medium',
      disclaimer: 'AI 辅助建议',
      system_prompt_version: '1.0',
      idempotency_key: 'idem-9',
      read_at: null,
      created_at: '2026-10-14T08:00:00.000Z',
    });
    expect(m.sessionId).toBe('sess-1');
    expect(m.systemPromptVersion).toBe('1.0');
    expect(m.idempotencyKey).toBe('idem-9');
    expect(m.readAt).toBeNull();
    expect(m.createdAt).toBe('2026-10-14T08:00:00.000Z');
    expect(m.toolResult).toBeNull();
  });
  it('缺失字段用默认值兜底', () => {
    const m = mapMessageRow({ id: 'x', session_id: 's', role: 'user' });
    expect(m.content).toBe('');
    expect(m.toolCalls).toEqual([]);
    expect(m.confidence).toBe('medium');
    expect(m.disclaimer).toBe(MEDMUSE_DEFAULT_DISCLAIMER);
  });
});

describe('toMessageView', () => {
  it('agent 角色映射为 assistant，user/tool 保持不变', () => {
    const base = {
      id: 'm1',
      sessionId: 's1',
      role: 'agent' as const,
      content: 'c',
      toolCalls: [],
      toolResult: null,
      confidence: 'low' as const,
      disclaimer: 'd',
      systemPromptVersion: '1.0',
      idempotencyKey: null,
      readAt: null,
      createdAt: '2026-10-14T08:00:00.000Z',
    };
    expect(toMessageView(base).role).toBe('assistant');
    expect(toMessageView({ ...base, role: 'user' }).role).toBe('user');
    expect(toMessageView({ ...base, role: 'tool' }).role).toBe('tool');
  });
});

describe('DEMO 内存兜底（不连 PG）', () => {
  it('insertMessage → listBySession 按写入顺序返回', async () => {
    process.env.DEMO_MODE = '1';
    await insertMessage({ sessionId: 'demo-sess-1', role: 'user', content: '第一句' });
    await insertMessage({ sessionId: 'demo-sess-1', role: 'agent', content: '回复一', confidence: 'low' });
    await insertMessage({ sessionId: 'demo-sess-1', role: 'user', content: '第二句' });

    const list = await listBySession('demo-sess-1');
    expect(list).toHaveLength(3);
    expect(list.map((m) => m.content)).toEqual(['第一句', '回复一', '第二句']);
    expect(list[1].confidence).toBe('low');
    expect(list[0].idempotencyKey).toBeNull();
  });

  it('listBySession 按 session 隔离', async () => {
    process.env.DEMO_MODE = '1';
    await insertMessage({ sessionId: 'sess-A', role: 'user', content: 'A 的消息' });
    expect(await listBySession('sess-A')).toHaveLength(1);
    expect(await listBySession('sess-B')).toEqual([]);
  });

  it('markRead 在 DEMO 下返回 0 且不抛错', async () => {
    process.env.DEMO_MODE = '1';
    await insertMessage({ sessionId: 'sess-C', role: 'agent', content: 'x' });
    await expect(markRead('sess-C')).resolves.toBe(0);
  });

  it('limit 生效', async () => {
    process.env.DEMO_MODE = '1';
    for (let i = 0; i < 5; i++) {
      await insertMessage({ sessionId: 'sess-L', role: 'user', content: `m${i}` });
    }
    expect(await listBySession('sess-L', 2)).toHaveLength(2);
  });
});
