/**
 * 集成测试 - consult-agent 路由错误分支与合规补测（契约 §12 端点 / §15 红线）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * DEMO_MODE=1，进程内 demo 仓储短路，不连库、不联网、不做真实 SSE 网络联调。
 * 以最小 fake Ctx 驱动 consultAgentRoutes handler，只补既有两文件未覆盖的分支：
 *  - 404：线程不存在 / 归属隔离（findOwnedThread 与编排器 THREAD_NOT_FOUND 映射）；
 *  - 409：终态（closed / aborted）线程访问消息 / 流式 / 退出等写端点；
 *  - 400：三个 zod schema 在权限闸之后的路由层反例校验；
 *  - 编排异常映射：THREAD_NOT_FOUND → 404、THREAD_CLOSED → 409、未知错误 → 500（不回显堆栈）；
 *  - 创建会话带首条消息的编排分支（thread / messages / draft 返回）；
 *  - 审计落痕齐全、工具审计字段白名单、无原始入参明文；
 *  - 急症旁路互补：草稿端点为空、回放无草稿帧、READ 端点可用；
 *  - 草稿红线在路由响应层（发送消息响应 / 草稿查询响应）逐项断言。
 *
 * 不重复覆盖：tests/security/consult-agent/permissions.test.ts 已测 401/403 与三码隔离；
 * tests/integration/consult-agent/consultFlow.test.ts 已测主链路 / 急症实时事件 /
 * 持久化草稿红线 / 主链路审计白名单 / 回放帧序与幂等 / closed 线程发消息 409 与重复退出 409。
 *
 * Handler 层不可达事项（如实标注，不构造脆弱用例）：
 *  - SSE 客户端 abort 监听（路由 150-154）与 ReadableStream cancel 回调（160-161）：
 *    handler 层无法构造真实浏览器 / HTTP 连接断开，仅在网络层断流时触发；
 *  - 创建会话路由 catch 分支（227-229）：新建线程即为 idle，不可能命中 THREAD_NOT_FOUND /
 *    THREAD_CLOSED；mapConsultError 三分支已由发送消息 / 流式问诊 catch 分支覆盖；
 *  - 幂等键 Idempotency-Key 由 server.ts 全局中间件装配，handler 层不消费，本测试不重复覆盖。
 */

import { describe, expect, it } from 'bun:test';

import { newCtx } from '../../../src/bff/middleware/auth.js';
import { CONSULT_AGENT_PERMISSIONS } from '../../../src/bff/permissions.js';
import { consultAgentRoutes } from '../../../src/bff/routes/consultAgentRoutes.js';
import type { Ctx, Handler } from '../../../src/bff/types.js';
import type {
  ConsultAgentPort,
  ConsultDraft,
  ConsultMessage,
  ConsultThread,
  SseEvent,
} from '../../../src/core/agent/consult/index.js';
import {
  ACUTE_GUIDANCE,
  DISCLAIMER,
  newId,
  nowIso,
} from '../../../src/core/agent/consult/index.js';
import { createConsultAgentRepo } from '../../../src/db/repositories/consultAgentRepo.js';

// ---------------------------------------------------------------------------
// 夹具：持三码的非 admin 用户（权限闸直接放行，聚焦 schema / 404 / 409 / 500 分支）
// ---------------------------------------------------------------------------

const ERROR_USER_ID = 'u-err-m86';
const OTHER_USER_ID = 'u-err-other';
const ERROR_TRACE = 'trc-err-m86';

const errorUser = {
  id: ERROR_USER_ID,
  name: '错误分支用户',
  roles: ['doctor'] as string[],
  permissions: [
    CONSULT_AGENT_PERMISSIONS.READ,
    CONSULT_AGENT_PERMISSIONS.WRITE,
    CONSULT_AGENT_PERMISSIONS.AUDIT,
  ],
};

/** 与路由模块共享同一 DEMO 进程内单例运行时 */
const sharedRepo: ConsultAgentPort = createConsultAgentRepo();

const SYMPTOM_TEXT = '我头痛三天了，有点咳嗽和乏力，症状比较明显';
const MEDICATION_TEXT = '布洛芬怎么服用，有没有副作用和注意事项？';
const ACUTE_TEXT = '我胸痛伴大汗，呼吸困难，意识不清';

function makeCtx(method: string, path: string, body: unknown, params: Record<string, string>): Ctx {
  const req = new Request(`http://localhost${path}`, { method });
  const ctx = newCtx(
    req,
    params,
    new URLSearchParams(),
    body === undefined ? null : JSON.stringify(body),
  );
  ctx.user = {
    id: errorUser.id,
    name: errorUser.name,
    roles: errorUser.roles,
    permissions: errorUser.permissions,
  };
  ctx.traceId = ERROR_TRACE;
  return ctx;
}

/** 按方法 + 模板段匹配路由，自动抽取 :threadId / :kind 等路径参数 */
function findRoute(
  method: string,
  path: string,
): {
  handle: Handler;
  params: Record<string, string>;
} {
  const actualSegments = path.split('/').filter(Boolean);
  for (const entry of consultAgentRoutes) {
    if (entry.method !== method) continue;
    const templateSegments = entry.path.split('/').filter(Boolean);
    if (templateSegments.length !== actualSegments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    templateSegments.forEach((segment, index) => {
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = actualSegments[index];
      } else if (segment !== actualSegments[index]) {
        matched = false;
      }
    });
    if (matched) {
      return { handle: entry.handle, params };
    }
  }
  throw new Error(`路由未注册：${method} ${path}`);
}

interface ErrorResult {
  status: number;
  code: number | null;
  data: unknown;
  message: string | null;
  traceId: string | null;
  res: Response;
  raw: string | null;
}

async function call(
  method: string,
  path: string,
  body?: unknown,
  explicitParams: Record<string, string> = {},
): Promise<ErrorResult> {
  const matched = findRoute(method, path);
  const params = { ...matched.params, ...explicitParams };
  const res = await matched.handle(makeCtx(method, path, body, params));
  let code: number | null = null;
  let data: unknown = null;
  let message: string | null = null;
  let traceId: string | null = null;
  let raw: string | null = null;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/event-stream')) {
    raw = await res.text();
  } else {
    try {
      const payload = (await res.json()) as {
        code?: number;
        data?: unknown;
        message?: string;
        traceId?: string;
      };
      code = typeof payload.code === 'number' ? payload.code : null;
      data = payload.data ?? null;
      message = typeof payload.message === 'string' ? payload.message : null;
      traceId = payload.traceId ?? null;
      raw = JSON.stringify(payload);
    } catch {
      data = null;
    }
  }
  return { status: res.status, code, data, message, traceId, res, raw };
}

interface ParsedFrame {
  payload: string;
  event: SseEvent | null;
}

/** 解析 SSE 帧序列：`data: {json}\n\n`，结束帧 `data: [DONE]\n\n`（契约 §11） */
function parseSseFrames(raw: string): ParsedFrame[] {
  return raw
    .split('\n\n')
    .filter((chunk) => chunk.trim().length > 0)
    .map((chunk) => {
      const line = chunk.trim();
      const payload = line.startsWith('data: ') ? line.slice(6) : line;
      if (payload === '[DONE]') {
        return { payload, event: null };
      }
      return { payload, event: JSON.parse(payload) as SseEvent };
    });
}

/** 构造当前用户名下线程实体（不落库，由 saveThread 持久化） */
function seedThread(overrides: Partial<ConsultThread> = {}): ConsultThread {
  const now = nowIso();
  return {
    id: newId('thread'),
    userId: ERROR_USER_ID,
    patientId: null,
    title: '错误分支测试会话',
    status: 'idle',
    intent: 'unknown',
    safetyLevel: 'normal',
    currentRole: null,
    meta: {},
    closedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function saveThread(thread: ConsultThread): Promise<string> {
  await sharedRepo.saveThread(thread);
  return thread.id;
}

/** 草稿红线字面量断言（契约 §15-3：AI 草稿恒需复核、不开院外处方、待复核态） */
function assertDraftRedLines(draft: ConsultDraft): void {
  expect(draft.needsPhysicianReview).toBe(true);
  expect(draft.isOutOfHospitalPrescription).toBe(false);
  expect(draft.status).toBe('pending_review');
}

// ---------------------------------------------------------------------------
// 1. 入参校验 400：schema 反例在权限闸之后被拒（非 401 / 403）
// ---------------------------------------------------------------------------

describe('consult-agent 错误分支 · 入参校验 400（权限闸之后，非 401/403）', () => {
  it('threadCreateSchema：标题超 120 字符 → 400 / 40000，拒绝后不落库', async () => {
    const before = await sharedRepo.listThreads(ERROR_USER_ID);
    const r = await call('POST', '/api/v1/consult-agent/threads', { title: '长'.repeat(121) });
    expect(r.status).toBe(400);
    expect(r.code).toBe(40000);
    expect(r.data).toBeNull();
    expect(r.status).not.toBe(401);
    expect(r.status).not.toBe(403);
    const after = await sharedRepo.listThreads(ERROR_USER_ID);
    expect(after.length).toBe(before.length);
  });

  it('threadCreateSchema：patientId 非 UUID → 400 / 40000', async () => {
    const r = await call('POST', '/api/v1/consult-agent/threads', { patientId: 'not-a-uuid' });
    expect(r.status).toBe(400);
    expect(r.code).toBe(40000);
    expect(r.data).toBeNull();
    expect(r.status).not.toBe(401);
    expect(r.status).not.toBe(403);
  });

  it('threadCreateSchema：initialMessage 超 2000 字符 → 400 / 40000', async () => {
    const r = await call('POST', '/api/v1/consult-agent/threads', {
      initialMessage: 'x'.repeat(2001),
    });
    expect(r.status).toBe(400);
    expect(r.code).toBe(40000);
    expect(r.data).toBeNull();
    expect(r.status).not.toBe(401);
    expect(r.status).not.toBe(403);
  });

  const messageSchemaCases: { label: string; body: unknown }[] = [
    { label: '空串', body: { content: '' } },
    { label: '纯空格', body: { content: '   ' } },
    { label: '超 4000 字符', body: { content: 'a'.repeat(4001) } },
  ];

  for (const schemaCase of messageSchemaCases) {
    it(`messageSendSchema（发送消息）：${schemaCase.label} → 400 / 40000`, async () => {
      const r = await call(
        'POST',
        '/api/v1/consult-agent/threads/thread-err-schema/messages',
        schemaCase.body,
      );
      expect(r.status).toBe(400);
      expect(r.code).toBe(40000);
      expect(r.data).toBeNull();
      expect(r.status).not.toBe(401);
      expect(r.status).not.toBe(403);
      expect(r.message).toContain('content 必填');
    });

    it(`messageSendSchema（流式问诊）：${schemaCase.label} → 400 / 40000`, async () => {
      const r = await call(
        'POST',
        '/api/v1/consult-agent/threads/thread-err-schema/stream',
        schemaCase.body,
      );
      expect(r.status).toBe(400);
      expect(r.code).toBe(40000);
      expect(r.data).toBeNull();
      expect(r.status).not.toBe(401);
      expect(r.status).not.toBe(403);
    });
  }

  it('transcribeSchema：transcript 与 audioText 皆空 → 400 / 40000（归属校验之后做 schema 校验）', async () => {
    const threadId = await saveThread(seedThread());
    const missingBoth = await call(
      'POST',
      `/api/v1/consult-agent/threads/${threadId}/transcribe`,
      {},
    );
    expect(missingBoth.status).toBe(400);
    expect(missingBoth.code).toBe(40000);
    expect(missingBoth.data).toBeNull();
    expect(missingBoth.message).toContain('transcript 与 audioText');

    const blankBoth = await call('POST', `/api/v1/consult-agent/threads/${threadId}/transcribe`, {
      transcript: '',
      audioText: '  ',
    });
    expect(blankBoth.status).toBe(400);
    expect(blankBoth.code).toBe(40000);
    expect(blankBoth.data).toBeNull();

    // 合法入参对照：归一化去首尾空白后返回文本，证明 schema 放行路径未被误拒
    const valid = await call('POST', `/api/v1/consult-agent/threads/${threadId}/transcribe`, {
      transcript: ' 我头晕 ',
    });
    expect(valid.status).toBe(200);
    expect((valid.data as { text: string }).text).toBe('我头晕');
  });

  it('草稿 kind 非法 → 400 / 40000（kind 校验先于线程归属校验）', async () => {
    for (const kind of ['summary', 'diagnosis-x']) {
      const r = await call('GET', `/api/v1/consult-agent/threads/thread-err-schema/drafts/${kind}`);
      expect(r.status).toBe(400);
      expect(r.code).toBe(40000);
      expect(r.data).toBeNull();
      expect(r.status).not.toBe(401);
      expect(r.status).not.toBe(403);
      expect(r.message).toContain('diagnosis / prescription');
    }
  });
});

// ---------------------------------------------------------------------------
// 2. 404：线程不存在与归属隔离
// ---------------------------------------------------------------------------

describe('consult-agent 错误分支 · 404 线程不存在与归属隔离', () => {
  const MISSING_THREAD_ID = 'thread-err-missing-0001';

  const threadScopedCases: {
    label: string;
    method: string;
    path: string;
    body?: unknown;
  }[] = [
    {
      label: '历史消息',
      method: 'GET',
      path: '/api/v1/consult-agent/threads/:id/messages',
    },
    { label: '审计轨迹', method: 'GET', path: '/api/v1/consult-agent/threads/:id/audit' },
    {
      label: '事件回放',
      method: 'GET',
      path: '/api/v1/consult-agent/threads/:id/stream/replay',
    },
    {
      label: '诊断草稿',
      method: 'GET',
      path: '/api/v1/consult-agent/threads/:id/drafts/diagnosis',
    },
    {
      label: '处方草稿',
      method: 'GET',
      path: '/api/v1/consult-agent/threads/:id/drafts/prescription',
    },
    {
      label: '语音转写',
      method: 'POST',
      path: '/api/v1/consult-agent/threads/:id/transcribe',
      body: { transcript: '探针文本' },
    },
    { label: '退出会话', method: 'POST', path: '/api/v1/consult-agent/threads/:id/exit', body: {} },
  ];

  for (const testCase of threadScopedCases) {
    it(`${testCase.label}（${testCase.method}）：线程不存在 → 404 / 40400`, async () => {
      const path = testCase.path.replace(':id', MISSING_THREAD_ID);
      const r = await call(testCase.method, path, testCase.body);
      expect(r.status).toBe(404);
      expect(r.code).toBe(40400);
      expect(r.data).toBeNull();
      expect(r.status).not.toBe(401);
      expect(r.status).not.toBe(403);
      expect(r.message).toBe('咨询会话不存在');
      expect(r.traceId).toBe(ERROR_TRACE);
    });
  }

  it('发送消息：线程不存在 → 编排器 THREAD_NOT_FOUND → 404 / 40400', async () => {
    const r = await call('POST', `/api/v1/consult-agent/threads/${MISSING_THREAD_ID}/messages`, {
      content: '探针消息',
    });
    expect(r.status).toBe(404);
    expect(r.code).toBe(40400);
    expect(r.data).toBeNull();
  });

  it('流式问诊：线程不存在 → 编排器 THREAD_NOT_FOUND → 404 / 40400', async () => {
    const r = await call('POST', `/api/v1/consult-agent/threads/${MISSING_THREAD_ID}/stream`, {
      content: '探针消息',
    });
    expect(r.status).toBe(404);
    expect(r.code).toBe(40400);
    expect(r.data).toBeNull();
  });

  it('归属隔离：他人线程对当前用户返回 404，他人会话消息 / 审计不被改动', async () => {
    const foreign = seedThread({ userId: OTHER_USER_ID, title: '他人会话' });
    await sharedRepo.saveThread(foreign);

    const foreignCases: [string, string, unknown][] = [
      ['GET', `/api/v1/consult-agent/threads/${foreign.id}/messages`, undefined],
      ['GET', `/api/v1/consult-agent/threads/${foreign.id}/audit`, undefined],
      ['GET', `/api/v1/consult-agent/threads/${foreign.id}/stream/replay`, undefined],
      ['GET', `/api/v1/consult-agent/threads/${foreign.id}/drafts/diagnosis`, undefined],
      [
        'POST',
        `/api/v1/consult-agent/threads/${foreign.id}/transcribe`,
        { transcript: '探针文本' },
      ],
      ['POST', `/api/v1/consult-agent/threads/${foreign.id}/exit`, {}],
      ['POST', `/api/v1/consult-agent/threads/${foreign.id}/messages`, { content: '探针消息' }],
      ['POST', `/api/v1/consult-agent/threads/${foreign.id}/stream`, { content: '探针消息' }],
    ];

    for (const [method, path, body] of foreignCases) {
      const r = await call(method, path, body);
      expect(r.status).toBe(404);
      expect(r.code).toBe(40400);
      expect(r.data).toBeNull();
    }

    const ownerThread = await sharedRepo.findThread(foreign.id, OTHER_USER_ID);
    expect(ownerThread?.userId).toBe(OTHER_USER_ID);
    expect(await sharedRepo.listMessages(foreign.id)).toEqual([]);
    expect(await sharedRepo.listAudit(foreign.id)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. 创建会话编排分支：首条消息走完编排，返回 thread / messages / draft
// ---------------------------------------------------------------------------

describe('consult-agent 创建会话编排分支（首条消息走编排，返回 thread/messages/draft）', () => {
  it('无 initialMessage：返回 idle 线程与空消息列表', async () => {
    const r = await call('POST', '/api/v1/consult-agent/threads', { title: '无首条消息会话' });
    expect(r.status).toBe(200);
    const data = r.data as { thread: ConsultThread; messages: ConsultMessage[] };
    expect(data.thread.status).toBe('idle');
    expect(data.thread.userId).toBe(ERROR_USER_ID);
    expect(data.messages).toEqual([]);
  });

  it('带症状 initialMessage：走完编排，返回线程 / 消息 / 草稿，草稿红线成立', async () => {
    const r = await call('POST', '/api/v1/consult-agent/threads', {
      title: '首聊编排会话',
      initialMessage: SYMPTOM_TEXT,
    });
    expect(r.status).toBe(200);
    const data = r.data as {
      thread: ConsultThread;
      messages: ConsultMessage[];
      draft: ConsultDraft | undefined;
    };
    expect(data.thread.id).toBeTruthy();
    expect(data.messages.length).toBeGreaterThan(0);
    const draft = data.draft;
    expect(draft).not.toBeNull();
    if (draft) {
      assertDraftRedLines(draft);
    }

    const persistedMessages = await sharedRepo.listMessages(data.thread.id);
    const assistant = persistedMessages.find((message) => message.role === 'assistant');
    expect(assistant?.disclaimer).toBe(DISCLAIMER);
    const audits = await sharedRepo.listAudit(data.thread.id);
    expect(audits.length).toBeGreaterThan(0);
    for (const audit of audits) {
      expect(audit.traceId).toBe(ERROR_TRACE);
    }
  });

  it('带急症 initialMessage：escalated 旁路，不产草稿，落 acute_bypass 审计', async () => {
    const r = await call('POST', '/api/v1/consult-agent/threads', {
      initialMessage: ACUTE_TEXT,
    });
    expect(r.status).toBe(200);
    const data = r.data as {
      thread: ConsultThread;
      messages: ConsultMessage[];
      draft: ConsultDraft | undefined;
    };
    expect(data.thread.status).toBe('escalated');
    expect(data.draft == null).toBe(true);
    expect(data.messages.length).toBeGreaterThan(0);

    const persistedMessages = await sharedRepo.listMessages(data.thread.id);
    expect(persistedMessages[0]?.content).toBe(ACUTE_GUIDANCE);
    expect(await sharedRepo.listDrafts(data.thread.id, 'diagnosis')).toEqual([]);
    expect(await sharedRepo.listDrafts(data.thread.id, 'prescription')).toEqual([]);

    const audits = await sharedRepo.listAudit(data.thread.id);
    const bypass = audits.find((entry) => entry.action === 'acute_bypass');
    expect(bypass?.actorRole).toBe('system');
    expect(bypass?.traceId).toBe(ERROR_TRACE);
  });
});

// ---------------------------------------------------------------------------
// 4. 409 终态冲突（补既有未覆盖写端点）与流式成功路径
// ---------------------------------------------------------------------------

describe('consult-agent 终态 409 冲突（补既有未覆盖写端点）与流式成功路径', () => {
  it('流式问诊成功路径：200 SSE，帧序列完整，草稿红线成立', async () => {
    const threadId = await saveThread(seedThread());
    const r = await call('POST', `/api/v1/consult-agent/threads/${threadId}/stream`, {
      content: SYMPTOM_TEXT,
    });
    expect(r.status).toBe(200);
    expect(r.res.headers.get('content-type')).toContain('text/event-stream');

    const frames = parseSseFrames(r.raw ?? '');
    expect(frames.at(-1)?.payload).toBe('[DONE]');
    const events = frames
      .filter((frame): frame is { payload: string; event: SseEvent } => frame.event !== null)
      .map((frame) => frame.event);
    const types = events.map((event) => event.type);
    for (const required of ['tool', 'delta', 'draft', 'disclaimer', 'meta', 'done'] as const) {
      expect(types).toContain(required);
    }
    const draftFrame = events.find((event) => event.type === 'draft');
    if (draftFrame?.type === 'draft') {
      assertDraftRedLines(draftFrame.draft);
    }
  }, 30000);

  it('aborted 会话：发送消息 / 流式问诊 / 退出 → 409 / 40900，线程状态保持 aborted', async () => {
    const aborted = seedThread({ status: 'aborted', title: '中止会话' });
    await sharedRepo.saveThread(aborted);

    const message = await call('POST', `/api/v1/consult-agent/threads/${aborted.id}/messages`, {
      content: '还在吗',
    });
    expect(message.status).toBe(409);
    expect(message.code).toBe(40900);
    expect(message.data).toBeNull();

    const stream = await call('POST', `/api/v1/consult-agent/threads/${aborted.id}/stream`, {
      content: '还在吗',
    });
    expect(stream.status).toBe(409);
    expect(stream.code).toBe(40900);
    expect(stream.data).toBeNull();

    const exit = await call('POST', `/api/v1/consult-agent/threads/${aborted.id}/exit`);
    expect(exit.status).toBe(409);
    expect(exit.code).toBe(40900);
    expect(exit.data).toBeNull();
    expect(exit.message).toBe('咨询会话已结束或已关闭');

    const persisted = await sharedRepo.findThread(aborted.id, ERROR_USER_ID);
    expect(persisted?.status).toBe('aborted');
  });

  it('closed 会话：流式问诊 / 发送消息 / 重复退出 → 409 / 40900', async () => {
    const closed = seedThread({ status: 'closed', closedAt: nowIso(), title: '已关闭会话' });
    await sharedRepo.saveThread(closed);

    const stream = await call('POST', `/api/v1/consult-agent/threads/${closed.id}/stream`, {
      content: '还在吗',
    });
    expect(stream.status).toBe(409);
    expect(stream.code).toBe(40900);

    const message = await call('POST', `/api/v1/consult-agent/threads/${closed.id}/messages`, {
      content: '还在吗',
    });
    expect(message.status).toBe(409);
    expect(message.code).toBe(40900);

    const exit = await call('POST', `/api/v1/consult-agent/threads/${closed.id}/exit`);
    expect(exit.status).toBe(409);
    expect(exit.code).toBe(40900);
  });

  it('源码口径：语音转写端点不做终态校验，closed 会话转写仍返回 200（该端点无 409 分支）', async () => {
    const closed = seedThread({
      status: 'closed',
      closedAt: nowIso(),
      title: '已关闭会话转写探针',
    });
    await sharedRepo.saveThread(closed);
    const r = await call('POST', `/api/v1/consult-agent/threads/${closed.id}/transcribe`, {
      transcript: ' 我头晕 ',
    });
    expect(r.status).toBe(200);
    expect((r.data as { text: string }).text).toBe('我头晕');
  });
});

// ---------------------------------------------------------------------------
// 5. mapConsultError 映射：404 / 409 / 500 分支与 500 脱敏
// ---------------------------------------------------------------------------

describe('consult-agent mapConsultError 映射：404 / 409 / 500 分支与 500 不回显堆栈', () => {
  it('THREAD_NOT_FOUND → 404 / 40400，固定文案，traceId 透传', async () => {
    const r = await call('POST', '/api/v1/consult-agent/threads/thread-err-map-404/messages', {
      content: '探针消息',
    });
    expect(r.status).toBe(404);
    expect(r.code).toBe(40400);
    expect(r.data).toBeNull();
    expect(r.message).toBe('咨询会话不存在');
    expect(r.traceId).toBe(ERROR_TRACE);
  });

  it('THREAD_CLOSED → 409 / 40900，固定文案，traceId 透传', async () => {
    const closed = seedThread({ status: 'closed', closedAt: nowIso(), title: '映射 409 探针' });
    await sharedRepo.saveThread(closed);
    const r = await call('POST', `/api/v1/consult-agent/threads/${closed.id}/stream`, {
      content: '还在吗',
    });
    expect(r.status).toBe(409);
    expect(r.code).toBe(40900);
    expect(r.data).toBeNull();
    expect(r.message).toBe('咨询会话已结束或已关闭');
    expect(r.traceId).toBe(ERROR_TRACE);
  });

  it('未知编排异常 → 500 / 50000，固定文案，不回显堆栈与内部状态名', async () => {
    // 先把线程推进到 review_pending，再追问急症：状态机 review_pending -> escalated 属非法
    // 转移，编排器抛出非 THREAD_NOT_FOUND / THREAD_CLOSED 的未知错误，落入 500 兜底分支。
    const created = await call('POST', '/api/v1/consult-agent/threads', {});
    const threadId = (created.data as { thread: ConsultThread }).thread.id;
    await call('POST', `/api/v1/consult-agent/threads/${threadId}/messages`, {
      content: SYMPTOM_TEXT,
    });
    const before = await sharedRepo.findThread(threadId, ERROR_USER_ID);
    expect(before?.status).toBe('review_pending');

    const stream = await call('POST', `/api/v1/consult-agent/threads/${threadId}/stream`, {
      content: ACUTE_TEXT,
    });
    expect(stream.status).toBe(500);
    expect(stream.code).toBe(50000);
    expect(stream.data).toBeNull();
    expect(stream.message).toBe('咨询处理失败，请稍后重试');
    expect(stream.traceId).toBe(ERROR_TRACE);
    for (const marker of ['非法状态转移', 'review_pending', 'escalated', 'stack', 'Error:']) {
      expect(stream.raw ?? '').not.toContain(marker);
    }

    const message = await call('POST', `/api/v1/consult-agent/threads/${threadId}/messages`, {
      content: ACUTE_TEXT,
    });
    expect(message.status).toBe(500);
    expect(message.code).toBe(50000);
    expect(message.data).toBeNull();
    for (const marker of ['非法状态转移', 'review_pending', 'escalated']) {
      expect(message.raw ?? '').not.toContain(marker);
    }

    // 失败编排未污染线程状态
    const after = await sharedRepo.findThread(threadId, ERROR_USER_ID);
    expect(after?.status).toBe('review_pending');
  });
});

// ---------------------------------------------------------------------------
// 6. 审计落痕与脱敏：字段齐全 / 工具审计白名单 / 无原始入参明文
// ---------------------------------------------------------------------------

describe('consult-agent 审计落痕与脱敏（字段齐全 / 工具白名单 / 无原始入参明文）', () => {
  it('常规问诊：actorRole / traceId / action / threadId 齐全，工具审计字段白名单', async () => {
    const threadId = await saveThread(seedThread());
    const rawPhrase = '探针脱敏专项短语蓝孔雀7319';
    await call('POST', `/api/v1/consult-agent/threads/${threadId}/messages`, {
      content: `${SYMPTOM_TEXT}，附加${rawPhrase}`,
    });

    const audits = await sharedRepo.listAudit(threadId);
    expect(audits.length).toBeGreaterThan(0);
    const allowedRoles = ['supervisor', 'examiner', 'doctor', 'pharmacist', 'system', 'user'];
    for (const audit of audits) {
      expect(allowedRoles).toContain(audit.actorRole);
      expect(audit.traceId).toBe(ERROR_TRACE);
      expect(audit.action.length).toBeGreaterThan(0);
      expect(audit.threadId).toBe(threadId);
    }

    const toolAudits = audits.filter((audit) => audit.toolName !== null);
    expect(toolAudits.length).toBeGreaterThan(0);
    for (const audit of toolAudits) {
      expect(audit.toolStatus).not.toBeNull();
      expect(typeof audit.durationMs).toBe('number');
      expect(typeof audit.evidenceCount).toBe('number');
      expect(audit.errorClass === null || typeof audit.errorClass === 'string').toBe(true);
      expect(Object.keys(audit.detail).sort()).toEqual(['summary', 'tool']);
    }

    const serialized = JSON.stringify(audits);
    expect(serialized).not.toContain(rawPhrase);
    for (const forbidden of ['rawArgs', 'raw_args', 'toolArgs', '原始入参']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('退出审计：actorRole=user、action=thread_exit、traceId 透传，detail 仅留 via 白名单', async () => {
    const threadId = await saveThread(seedThread());
    const exit = await call('POST', `/api/v1/consult-agent/threads/${threadId}/exit`);
    expect(exit.status).toBe(200);

    const audits = await sharedRepo.listAudit(threadId);
    const exitAudit = audits.find((audit) => audit.action === 'thread_exit');
    expect(exitAudit).not.toBeNull();
    expect(exitAudit?.actorRole).toBe('user');
    expect(exitAudit?.traceId).toBe(ERROR_TRACE);
    expect(exitAudit?.threadId).toBe(threadId);
    expect(Object.keys(exitAudit?.detail ?? {}).sort()).toEqual(['via']);
    expect(exitAudit?.detail.via).toBe('exit_endpoint');
  });

  it('急症旁路审计：actorRole=system、action=acute_bypass，detail 仅留 level/matched 白名单', async () => {
    const threadId = await saveThread(seedThread());
    await call('POST', `/api/v1/consult-agent/threads/${threadId}/messages`, {
      content: ACUTE_TEXT,
    });

    const audits = await sharedRepo.listAudit(threadId);
    const bypass = audits.find((audit) => audit.action === 'acute_bypass');
    expect(bypass).not.toBeNull();
    expect(bypass?.actorRole).toBe('system');
    expect(bypass?.toolName).toBeNull();
    expect(bypass?.traceId).toBe(ERROR_TRACE);
    expect(Object.keys(bypass?.detail ?? {}).sort()).toEqual(['level', 'matched']);
    expect(Array.isArray(bypass?.detail.matched)).toBe(true);
    expect((bypass?.detail.matched as string[]).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 7. 急症旁路互补场景：草稿端点为空 / 回放无草稿帧 / READ 端点可用
// ---------------------------------------------------------------------------

describe('consult-agent 急症旁路互补场景（草稿端点为空 / 回放无草稿帧 / READ 端点可用）', () => {
  let acuteThreadId = '';

  it('急症线程：草稿查询两端均返回 null，持久化无草稿', async () => {
    const created = await call('POST', '/api/v1/consult-agent/threads', {});
    acuteThreadId = (created.data as { thread: ConsultThread }).thread.id;
    await call('POST', `/api/v1/consult-agent/threads/${acuteThreadId}/messages`, {
      content: ACUTE_TEXT,
    });

    const diagnosis = await call(
      'GET',
      `/api/v1/consult-agent/threads/${acuteThreadId}/drafts/diagnosis`,
    );
    expect(diagnosis.status).toBe(200);
    expect((diagnosis.data as { draft: ConsultDraft | null }).draft).toBeNull();

    const prescription = await call(
      'GET',
      `/api/v1/consult-agent/threads/${acuteThreadId}/drafts/prescription`,
    );
    expect(prescription.status).toBe(200);
    expect((prescription.data as { draft: ConsultDraft | null }).draft).toBeNull();

    expect(await sharedRepo.listDrafts(acuteThreadId, 'diagnosis')).toEqual([]);
    expect(await sharedRepo.listDrafts(acuteThreadId, 'prescription')).toEqual([]);
  });

  it('急症线程回放：仅重放持久化消息 / 免责声明 / meta / done，不重放 live safety:acute 与草稿帧', async () => {
    const r = await call('GET', `/api/v1/consult-agent/threads/${acuteThreadId}/stream/replay`);
    expect(r.status).toBe(200);
    expect(r.res.headers.get('content-type')).toContain('text/event-stream');

    const frames = parseSseFrames(r.raw ?? '');
    expect(frames.at(-1)?.payload).toBe('[DONE]');
    const events = frames
      .filter((frame): frame is { payload: string; event: SseEvent } => frame.event !== null)
      .map((frame) => frame.event);
    const types = events.map((event) => event.type);
    expect(types).toContain('delta');
    expect(types).toContain('disclaimer');
    expect(types).toContain('meta');
    expect(types).toContain('done');
    expect(types).not.toContain('draft');
    // 源码口径：回放只重放持久化消息 / 草稿 / 审计工具事件，live safety:acute 事件不持久化、不重放
    expect(types).not.toContain('safety:acute');

    // 回放按 ~10 字切分 delta 帧，拼接后应等于持久化的急症引导全文
    const deltaTexts = events.flatMap((event) => (event.type === 'delta' ? [event.text] : []));
    expect(deltaTexts.join('')).toBe(ACUTE_GUIDANCE);
  }, 30000);

  it('急症线程 READ 端点：规则快照 / 画像 / 历史消息可用', async () => {
    const snapshot = await call('GET', '/api/v1/consult-agent/rules/snapshot');
    expect(snapshot.status).toBe(200);
    const snapshotData = snapshot.data as {
      version: string;
      disclaimer: string;
      acuteKeywords: string[];
      tools: unknown[];
      permissions: { READ: string; WRITE: string; AUDIT: string };
    };
    expect(snapshotData.disclaimer.length).toBeGreaterThan(0);
    expect(snapshotData.permissions.READ).toBe(CONSULT_AGENT_PERMISSIONS.READ);
    expect(snapshotData.permissions.WRITE).toBe(CONSULT_AGENT_PERMISSIONS.WRITE);
    expect(snapshotData.permissions.AUDIT).toBe(CONSULT_AGENT_PERMISSIONS.AUDIT);

    const profile = await call('GET', '/api/v1/consult-agent/profile');
    expect(profile.status).toBe(200);
    expect(Array.isArray((profile.data as { facts: unknown[] }).facts)).toBe(true);

    const messages = await call('GET', `/api/v1/consult-agent/threads/${acuteThreadId}/messages`);
    expect(messages.status).toBe(200);
    const messageList = (messages.data as { messages: ConsultMessage[] }).messages;
    expect(messageList[0]?.content).toBe(ACUTE_GUIDANCE);
    expect(messageList[0]?.safetyLevel).toBe('acute');
  });
});

// ---------------------------------------------------------------------------
// 8. 草稿红线（路由响应层：发送消息响应与草稿查询响应）
// ---------------------------------------------------------------------------

describe('consult-agent 草稿红线（路由响应层）', () => {
  it('医师诊断草稿：响应与查询两端红线三字段成立，kind=diagnosis', async () => {
    const created = await call('POST', '/api/v1/consult-agent/threads', {});
    const threadId = (created.data as { thread: ConsultThread }).thread.id;

    const sent = await call('POST', `/api/v1/consult-agent/threads/${threadId}/messages`, {
      content: SYMPTOM_TEXT,
    });
    const sentDraft = (sent.data as { draft: ConsultDraft | null }).draft;
    expect(sentDraft).not.toBeNull();
    if (sentDraft) {
      expect(sentDraft.kind).toBe('diagnosis');
      assertDraftRedLines(sentDraft);
    }

    const fetched = await call('GET', `/api/v1/consult-agent/threads/${threadId}/drafts/diagnosis`);
    expect(fetched.status).toBe(200);
    const fetchedDraft = (fetched.data as { draft: ConsultDraft | null }).draft;
    expect(fetchedDraft).not.toBeNull();
    if (fetchedDraft) {
      expect(fetchedDraft.kind).toBe('diagnosis');
      assertDraftRedLines(fetchedDraft);
    }
  });

  it('药师处方草稿：红线三字段成立，kind=prescription', async () => {
    const created = await call('POST', '/api/v1/consult-agent/threads', {});
    const threadId = (created.data as { thread: ConsultThread }).thread.id;

    await call('POST', `/api/v1/consult-agent/threads/${threadId}/messages`, {
      content: MEDICATION_TEXT,
    });

    const fetched = await call(
      'GET',
      `/api/v1/consult-agent/threads/${threadId}/drafts/prescription`,
    );
    expect(fetched.status).toBe(200);
    const draft = (fetched.data as { draft: ConsultDraft | null }).draft;
    expect(draft).not.toBeNull();
    if (draft) {
      expect(draft.kind).toBe('prescription');
      assertDraftRedLines(draft);
    }
  });

  it('无草稿线程：草稿端点返回 null', async () => {
    const threadId = await saveThread(seedThread());
    const r = await call('GET', `/api/v1/consult-agent/threads/${threadId}/drafts/diagnosis`);
    expect(r.status).toBe(200);
    expect((r.data as { draft: ConsultDraft | null }).draft).toBeNull();
  });
});
