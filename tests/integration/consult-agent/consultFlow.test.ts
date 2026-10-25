/**
 * 集成测试 - consult-agent E2E 主链路（契约 §10 编排 / §11 SSE / §12 端点 / §15 红线）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * DEMO_MODE=1，进程内 demo 仓储短路，不连库、不联网。以最小 fake Ctx 驱动
 * consultAgentRoutes handler，覆盖：
 *  1. 创建会话（idle，免责声明随后续产物附着）；
 *  2. 普通问诊走完编排：assistant 回复落库、附免责声明、审计留痕、草稿恒需复核；
 *  3. 急症旁路：escalated + safety:acute 引导，不产草稿，acute_bypass 留痕；
 *  4. 草稿链路：医师诊断草稿 / 药师处方草稿红线字面量；
 *  5. 审计轨迹：时间升序、actorRole/traceId/action 齐全、工具记录字段白名单；
 *  6. 事件回放：帧类型集合与顺序符合 §11，末尾 [DONE]，重复回放幂等一致；
 *  7. 终态：closed 后再发消息 → 409 THREAD_CLOSED 语义。
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
import { ACUTE_GUIDANCE, DISCLAIMER } from '../../../src/core/agent/consult/types.js';
import { createConsultAgentRepo } from '../../../src/db/repositories/consultAgentRepo.js';

// ---------------------------------------------------------------------------
// 夹具：流程用户（read + write，无 audit 码）与共享进程内仓储
// ---------------------------------------------------------------------------

const FLOW_USER = 'u-flow-m86';
const FLOW_TRACE = 'trc-flow-m86';

const flowUser = {
  id: FLOW_USER,
  name: '集成流程用户',
  roles: ['doctor'] as string[],
  permissions: [CONSULT_AGENT_PERMISSIONS.READ, CONSULT_AGENT_PERMISSIONS.WRITE],
};

/** 与路由模块共享同一 DEMO 进程内单例运行时 */
const sharedRepo: ConsultAgentPort = createConsultAgentRepo();

function makeCtx(method: string, path: string, body: unknown, params: Record<string, string>): Ctx {
  const req = new Request(`http://localhost${path}`, { method });
  const ctx = newCtx(
    req,
    params,
    new URLSearchParams(),
    body === undefined ? null : JSON.stringify(body),
  );
  ctx.user = {
    id: flowUser.id,
    name: flowUser.name,
    roles: flowUser.roles,
    permissions: flowUser.permissions,
  };
  ctx.traceId = FLOW_TRACE;
  return ctx;
}

interface FlowResult {
  status: number;
  code: number | null;
  data: unknown;
  res: Response;
  raw: string | null;
}

/** 按方法 + 模板段匹配路由，自动从具体路径抽取 :threadId / :kind 等路径参数 */
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

async function call(
  method: string,
  path: string,
  body?: unknown,
  explicitParams: Record<string, string> = {},
): Promise<FlowResult> {
  const matched = findRoute(method, path);
  const params = { ...matched.params, ...explicitParams };
  const res = await matched.handle(makeCtx(method, path, body, params));
  let code: number | null = null;
  let data: unknown = null;
  let raw: string | null = null;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/event-stream')) {
    raw = await res.text();
  } else {
    try {
      const payload = (await res.json()) as { code?: number; data?: unknown };
      code = typeof payload.code === 'number' ? payload.code : null;
      data = payload.data ?? null;
    } catch {
      data = null;
    }
  }
  return { status: res.status, code, data, res, raw };
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

// ---------------------------------------------------------------------------
// E2E 主链路（用例按会话推进顺序执行，共享闭包线程 ID）
// ---------------------------------------------------------------------------

describe('consult-agent 集成 E2E 主链路（DEMO 进程内仓储）', () => {
  let doctorThreadId = '';
  let acuteThreadId = '';
  let pharmacistThreadId = '';
  let closedThreadId = '';

  it('1. 创建会话：初始 idle、消息列表为空，免责声明随后续产物附着', async () => {
    const created = await call('POST', '/api/v1/consult-agent/threads', {
      title: '集成 E2E 会话',
    });
    expect(created.status).toBe(200);
    const payload = created.data as { thread: ConsultThread; messages: ConsultMessage[] };
    expect(payload.thread.status).toBe('idle');
    expect(payload.thread.userId).toBe(FLOW_USER);
    expect(payload.thread.closedAt).toBeNull();
    expect(payload.messages).toEqual([]);
    doctorThreadId = payload.thread.id;

    const persisted = await sharedRepo.findThread(doctorThreadId, FLOW_USER);
    expect(persisted?.status).toBe('idle');
  });

  it('2. 普通问诊：编排完成、回复落库附免责声明、审计留痕、草稿恒需复核', async () => {
    const sent = await call('POST', `/api/v1/consult-agent/threads/${doctorThreadId}/messages`, {
      content: '我头痛三天了，有点咳嗽和乏力，症状比较明显',
    });
    expect(sent.status).toBe(200);
    const payload = sent.data as {
      thread: ConsultThread;
      message: ConsultMessage;
      draft: ConsultDraft | null;
      events: SseEvent[];
    };
    expect(payload.message.role).toBe('assistant');
    expect(payload.message.content).toContain(DISCLAIMER);
    expect(payload.message.disclaimer).toBe(DISCLAIMER);
    expect(payload.message.traceId).toBe(FLOW_TRACE);
    expect(payload.message.roleKind).toBe('doctor');
    expect(payload.thread.status).toBe('review_pending');

    const persistedMessages = await sharedRepo.listMessages(doctorThreadId);
    expect(persistedMessages.length).toBeGreaterThan(0);
    const persistedAssistant = persistedMessages.find((message) => message.role === 'assistant');
    expect(persistedAssistant?.disclaimer).toBe(DISCLAIMER);

    const audits = await sharedRepo.listAudit(doctorThreadId);
    expect(audits.length).toBeGreaterThan(0);

    const diagnosisDraft = payload.draft;
    expect(diagnosisDraft).not.toBeNull();
    if (!diagnosisDraft) {
      throw new Error('缺少医师诊断草稿');
    }
    const draft = diagnosisDraft;
    expect(draft.kind).toBe('diagnosis');
    expect(draft.needsPhysicianReview).toBe(true);
    expect(draft.isOutOfHospitalPrescription).toBe(false);
    expect(draft.status).toBe('pending_review');
    expect(draft.evidence.length).toBeGreaterThan(0);
    expect(draft.content).toContain(DISCLAIMER);
    expect(draft.content).toContain('待复核');
  });

  it('3. 急症旁路：escalated + safety:acute 引导，不产草稿，acute_bypass 留痕', async () => {
    const created = await call('POST', '/api/v1/consult-agent/threads', {});
    acuteThreadId = (created.data as { thread: ConsultThread }).thread.id;

    const sent = await call('POST', `/api/v1/consult-agent/threads/${acuteThreadId}/messages`, {
      content: '我胸痛伴大汗，呼吸困难，意识不清',
    });
    expect(sent.status).toBe(200);
    const payload = sent.data as {
      thread: ConsultThread;
      message: ConsultMessage;
      draft: ConsultDraft | null;
      events: SseEvent[];
    };
    expect(payload.thread.status).toBe('escalated');
    expect(payload.message.content).toBe(ACUTE_GUIDANCE);
    expect(payload.message.safetyLevel).toBe('acute');
    // BFF 信封将 null 草稿合并为 undefined，响应层无草稿即符合“不产草稿”要求
    expect(payload.draft == null).toBe(true);

    const acuteEvent = payload.events.find((event) => event.type === 'safety:acute');
    expect(acuteEvent).not.toBeNull();
    if (acuteEvent?.type === 'safety:acute') {
      expect(acuteEvent.matched.length).toBeGreaterThan(0);
      expect(acuteEvent.guidance).toBe(ACUTE_GUIDANCE);
    }
    expect(payload.events.some((event) => event.type === 'draft')).toBe(false);

    expect(await sharedRepo.listDrafts(acuteThreadId, 'diagnosis')).toEqual([]);
    expect(await sharedRepo.listDrafts(acuteThreadId, 'prescription')).toEqual([]);

    const audits = await sharedRepo.listAudit(acuteThreadId);
    const bypass = audits.find((entry) => entry.action === 'acute_bypass');
    expect(bypass?.actorRole).toBe('system');
    expect(bypass?.traceId).toBe(FLOW_TRACE);
    expect(Array.isArray(bypass?.detail.matched)).toBe(true);
    expect((bypass?.detail.matched as string[]).length).toBeGreaterThan(0);

    const persistedMessages = await sharedRepo.listMessages(acuteThreadId);
    expect(persistedMessages[0]?.content).toBe(ACUTE_GUIDANCE);
    expect(persistedMessages[0]?.disclaimer).toBe(DISCLAIMER);
  });

  it('4. 草稿链路：用药咨询生成处方草稿，非院外处方、待医师复核', async () => {
    const created = await call('POST', '/api/v1/consult-agent/threads', {});
    pharmacistThreadId = (created.data as { thread: ConsultThread }).thread.id;

    const sent = await call(
      'POST',
      `/api/v1/consult-agent/threads/${pharmacistThreadId}/messages`,
      { content: '布洛芬怎么服用，有没有副作用和注意事项？' },
    );
    expect(sent.status).toBe(200);
    const payload = sent.data as { draft: ConsultDraft | null };
    const prescriptionDraft = payload.draft;
    expect(prescriptionDraft).not.toBeNull();
    if (!prescriptionDraft) {
      throw new Error('缺少药师处方草稿');
    }
    const draft = prescriptionDraft;
    expect(draft.kind).toBe('prescription');
    expect(draft.needsPhysicianReview).toBe(true);
    expect(draft.isOutOfHospitalPrescription).toBe(false);
    expect(draft.status).toBe('pending_review');
    expect(draft.content).toContain('在院医嘱');
    expect(draft.content).toContain(DISCLAIMER);
    expect(draft.evidence.some((entry) => entry.kind === 'drug')).toBe(true);

    const persistedPrescription = await sharedRepo.listDrafts(pharmacistThreadId, 'prescription');
    expect(persistedPrescription.length).toBe(1);
    expect(persistedPrescription[0].needsPhysicianReview).toBe(true);
    expect(persistedPrescription[0].isOutOfHospitalPrescription).toBe(false);
    expect(persistedPrescription[0].status).toBe('pending_review');
    expect(await sharedRepo.listDrafts(pharmacistThreadId, 'diagnosis')).toEqual([]);
  });

  it('5. 审计轨迹：升序排列、actorRole/traceId/action 齐全；工具记录字段白名单、无原始入参', async () => {
    const entries = await sharedRepo.listAudit(doctorThreadId);
    expect(entries.length).toBeGreaterThan(0);
    for (let index = 1; index < entries.length; index += 1) {
      expect(entries[index].createdAt >= entries[index - 1].createdAt).toBe(true);
    }

    const allowedRoles = ['supervisor', 'examiner', 'doctor', 'pharmacist', 'system', 'user'];
    for (const entry of entries) {
      expect(allowedRoles).toContain(entry.actorRole);
      expect(entry.traceId).toBe(FLOW_TRACE);
      expect(entry.action.length).toBeGreaterThan(0);
    }

    const toolAudits = entries.filter((entry) => entry.toolName !== null);
    expect(toolAudits.length).toBeGreaterThan(0);
    for (const entry of toolAudits) {
      expect(entry.toolStatus).not.toBeNull();
      expect(typeof entry.durationMs).toBe('number');
      expect(typeof entry.evidenceCount).toBe('number');
      expect(entry.errorClass === null || typeof entry.errorClass === 'string').toBe(true);
      expect(Object.keys(entry.detail).sort()).toEqual(['summary', 'tool']);
    }

    const persistedMessages = await sharedRepo.listMessages(doctorThreadId);
    const persistedAssistant = persistedMessages.find((message) => message.role === 'assistant');
    if (!persistedAssistant) {
      throw new Error('缺少 assistant 持久化消息');
    }
    expect(persistedAssistant.toolCalls).not.toBeNull();
    for (const callRecord of persistedAssistant.toolCalls ?? []) {
      expect(Object.keys(callRecord).sort()).toEqual([
        'callId',
        'durationMs',
        'errorClass',
        'evidenceCount',
        'name',
        'status',
        'summary',
      ]);
    }

    const serialized = JSON.stringify(entries);
    for (const forbidden of ['rawArgs', 'raw_args', 'toolArgs', '原始入参']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('6. 事件回放：帧类型集合与顺序符合契约 §11，末尾 [DONE]，重复回放幂等一致', async () => {
    const first = await call(
      'GET',
      `/api/v1/consult-agent/threads/${doctorThreadId}/stream/replay`,
    );
    expect(first.status).toBe(200);
    expect(first.res.headers.get('content-type')).toContain('text/event-stream');
    if (!first.raw) {
      throw new Error('回放流为空');
    }

    const frames = parseSseFrames(first.raw);
    expect(frames[frames.length - 1]?.payload).toBe('[DONE]');
    const events = frames
      .filter((frame): frame is { payload: string; event: SseEvent } => frame.event !== null)
      .map((frame) => frame.event);
    const types: string[] = events.map((event) => event.type);

    const allowedTypes = [
      'delta',
      'tool',
      'safety:acute',
      'draft',
      'disclaimer',
      'meta',
      'done',
      'error',
    ];
    for (const type of types) {
      expect(allowedTypes).toContain(type);
    }
    expect(types).not.toContain('error');
    expect(types).not.toContain('safety:acute');
    for (const required of ['tool', 'delta', 'disclaimer', 'draft', 'meta', 'done'] as const) {
      expect(types).toContain(required);
    }

    const metaIndex = types.lastIndexOf('meta');
    const doneIndex = types.lastIndexOf('done');
    expect(metaIndex).toBeLessThan(doneIndex);
    expect(doneIndex).toBe(types.length - 1);
    expect(types.indexOf('tool')).toBeLessThan(types.indexOf('delta'));

    // 幂等：第二次回放帧载荷序列与第一次逐帧一致
    const second = await call(
      'GET',
      `/api/v1/consult-agent/threads/${doctorThreadId}/stream/replay`,
    );
    expect(second.status).toBe(200);
    expect(second.raw).toBe(first.raw);
  }, 30000);

  it('7. 终态：关闭会话后再发消息 → 409 THREAD_CLOSED 语义', async () => {
    const created = await call('POST', '/api/v1/consult-agent/threads', {});
    closedThreadId = (created.data as { thread: ConsultThread }).thread.id;

    const exited = await call('POST', `/api/v1/consult-agent/threads/${closedThreadId}/exit`);
    expect(exited.status).toBe(200);
    const exitedThread = (exited.data as { thread: ConsultThread }).thread;
    expect(exitedThread.status).toBe('closed');
    expect(exitedThread.closedAt).not.toBeNull();
    const exitAudits = await sharedRepo.listAudit(closedThreadId);
    expect(exitAudits.some((entry) => entry.action === 'thread_exit')).toBe(true);

    const rejected = await call(
      'POST',
      `/api/v1/consult-agent/threads/${closedThreadId}/messages`,
      { content: '我又头晕了' },
    );
    expect(rejected.status).toBe(409);
    expect(rejected.code).toBe(40900);
    expect(rejected.data).toBeNull();

    const exitAgain = await call('POST', `/api/v1/consult-agent/threads/${closedThreadId}/exit`);
    expect(exitAgain.status).toBe(409);

    const persisted = await sharedRepo.findThread(closedThreadId, FLOW_USER);
    expect(persisted?.status).toBe('closed');
    expect(await sharedRepo.listMessages(closedThreadId)).toEqual([]);
  });
});
