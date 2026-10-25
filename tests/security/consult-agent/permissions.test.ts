/**
 * 安全测试 - consult-agent 路由权限码门禁（契约 §12 端点表 / §15-4 写操作三件套）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * DEMO_MODE=1，进程内 demo 仓储短路，不连库、不联网。以最小 fake Ctx 驱动
 * consultAgentRoutes 12 个 handler，覆盖三条权限码：
 *  - consult-agent:read   GET 会话列表 / 历史消息 / 回放 / 规则快照 / 草稿 / 画像
 *  - consult-agent:write  POST 创建会话 / 发送消息 / 语音转写 / 流式问诊 / 退出会话
 *  - consult-agent:audit  GET 审计轨迹（与 read/write 相互隔离）
 * 未登录 → 401（40100）；已登录缺码 → 403（40300）；持码通过权限闸，不出现
 * 401/403；拒绝路径不触发仓储写操作。
 */

import { beforeAll, describe, expect, it } from 'bun:test';

import { newCtx, requirePermissionCode } from '../../../src/bff/middleware/auth.js';
import { CONSULT_AGENT_PERMISSIONS } from '../../../src/bff/permissions.js';
import { consultAgentRoutes } from '../../../src/bff/routes/consultAgentRoutes.js';
import type { Ctx } from '../../../src/bff/types.js';
import type { ConsultAgentPort, ConsultThread } from '../../../src/core/agent/consult/index.js';
import { createConsultAgentRepo } from '../../../src/db/repositories/consultAgentRepo.js';

// ---------------------------------------------------------------------------
// 夹具：三类角色用户（均非 admin，避免角色直通旁路干扰权限码判定）
// ---------------------------------------------------------------------------

interface FakeUser {
  id: string;
  name: string;
  roles: string[];
  permissions: string[];
}

const NO_ROLE_USER: FakeUser = {
  id: 'u-perm-none',
  name: '无权限用户',
  roles: ['doctor'],
  permissions: [],
};
const READ_USER: FakeUser = {
  id: 'u-perm-read',
  name: '只读用户',
  roles: ['doctor'],
  permissions: [CONSULT_AGENT_PERMISSIONS.READ],
};
const WRITE_USER: FakeUser = {
  id: 'u-perm-write',
  name: '写操作用户',
  roles: ['doctor'],
  permissions: [CONSULT_AGENT_PERMISSIONS.WRITE],
};
const AUDIT_USER: FakeUser = {
  id: 'u-perm-audit',
  name: '审计用户',
  roles: ['auditor'],
  permissions: [CONSULT_AGENT_PERMISSIONS.AUDIT],
};
const ADMIN_USER: FakeUser = {
  id: 'u-perm-admin',
  name: '管理员',
  roles: ['admin'],
  permissions: [],
};

interface EndpointCase {
  label: string;
  method: string;
  path: string;
  body: unknown;
  params: Record<string, string>;
}

/** read 码覆盖端点（契约 §12 #2 / #4 / #7 / #9 / #10 / #11） */
const READ_ENDPOINTS: EndpointCase[] = [
  {
    label: '会话列表',
    method: 'GET',
    path: '/api/v1/consult-agent/threads',
    body: undefined,
    params: {},
  },
  {
    label: '历史消息',
    method: 'GET',
    path: '/api/v1/consult-agent/threads/:threadId/messages',
    body: undefined,
    params: { threadId: 'seed-read-1' },
  },
  {
    label: '事件回放',
    method: 'GET',
    path: '/api/v1/consult-agent/threads/:threadId/stream/replay',
    body: undefined,
    params: { threadId: 'seed-read-1' },
  },
  {
    label: '规则快照',
    method: 'GET',
    path: '/api/v1/consult-agent/rules/snapshot',
    body: undefined,
    params: {},
  },
  {
    label: '草稿查询',
    method: 'GET',
    path: '/api/v1/consult-agent/threads/:threadId/drafts/:kind',
    body: undefined,
    params: { threadId: 'seed-read-1', kind: 'diagnosis' },
  },
  {
    label: '用户画像',
    method: 'GET',
    path: '/api/v1/consult-agent/profile',
    body: undefined,
    params: {},
  },
];

/** write 码覆盖端点（契约 §12 #1 / #3 / #5 / #8 / #12） */
const WRITE_ENDPOINTS: EndpointCase[] = [
  {
    label: '创建会话',
    method: 'POST',
    path: '/api/v1/consult-agent/threads',
    body: {},
    params: {},
  },
  {
    label: '发送消息',
    method: 'POST',
    path: '/api/v1/consult-agent/threads/:threadId/messages',
    body: { content: '权限闸放行探针（非临床输入）' },
    params: { threadId: 'seed-write-msg' },
  },
  {
    label: '语音转写',
    method: 'POST',
    path: '/api/v1/consult-agent/threads/:threadId/transcribe',
    body: { transcript: '转写探针文本' },
    params: { threadId: 'seed-write-transcribe' },
  },
  {
    label: '流式问诊',
    method: 'POST',
    path: '/api/v1/consult-agent/threads/:threadId/stream',
    body: {},
    params: { threadId: 'seed-write-stream' },
  },
  {
    label: '退出会话',
    method: 'POST',
    path: '/api/v1/consult-agent/threads/:threadId/exit',
    body: {},
    params: { threadId: 'seed-write-exit' },
  },
];

/** audit 码覆盖端点（契约 §12 #6，与 read/write 相互隔离） */
const AUDIT_ENDPOINT: EndpointCase = {
  label: '审计轨迹',
  method: 'GET',
  path: '/api/v1/consult-agent/threads/:threadId/audit',
  body: undefined,
  params: { threadId: 'seed-audit-1' },
};

const ALL_ENDPOINTS: EndpointCase[] = [...READ_ENDPOINTS, ...WRITE_ENDPOINTS, AUDIT_ENDPOINT];

// ---------------------------------------------------------------------------
// 夹具构造与路由调用
// ---------------------------------------------------------------------------

/** 与 newCtx 同构的测试仓储（DEMO 进程内单例，与路由模块共享同一运行时） */
const sharedRepo: ConsultAgentPort = createConsultAgentRepo();

function makeCtx(user: FakeUser | null, endpoint: EndpointCase): Ctx {
  const req = new Request(`http://localhost${endpoint.path}`, {
    method: endpoint.method,
  });
  const ctx = newCtx(
    req,
    endpoint.params,
    new URLSearchParams(),
    endpoint.body === undefined ? null : JSON.stringify(endpoint.body),
  );
  ctx.user =
    user === null
      ? null
      : { id: user.id, name: user.name, roles: user.roles, permissions: user.permissions };
  return ctx;
}

function findRoute(method: string, path: string) {
  const route = consultAgentRoutes.find((entry) => entry.method === method && entry.path === path);
  if (!route) {
    throw new Error(`路由未注册：${method} ${path}`);
  }
  return route;
}

interface CallResult {
  status: number;
  code: number | null;
  data: unknown;
  contentType: string | null;
}

async function callRoute(endpoint: EndpointCase, user: FakeUser | null): Promise<CallResult> {
  const res = await findRoute(endpoint.method, endpoint.path).handle(makeCtx(user, endpoint));
  let code: number | null = null;
  let data: unknown = null;
  try {
    const payload = (await res.json()) as { code?: number; data?: unknown };
    code = typeof payload?.code === 'number' ? payload.code : null;
    data = payload?.data ?? null;
  } catch {
    // SSE 流响应非 JSON，仅读取状态码与内容类型
  }
  return { status: res.status, code, data, contentType: res.headers.get('content-type') };
}

/** 在共享进程内仓储中为指定用户种子一条空闲会话（不经过权限闸） */
async function seedThread(userId: string, threadId: string): Promise<void> {
  const now = new Date().toISOString();
  const thread: ConsultThread = {
    id: threadId,
    userId,
    patientId: null,
    title: '权限测试种子会话',
    status: 'idle',
    intent: 'unknown',
    safetyLevel: 'normal',
    currentRole: null,
    meta: {},
    closedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await sharedRepo.saveThread(thread);
}

beforeAll(async () => {
  await seedThread(READ_USER.id, 'seed-read-1');
  await seedThread(WRITE_USER.id, 'seed-write-msg');
  await seedThread(WRITE_USER.id, 'seed-write-transcribe');
  await seedThread(WRITE_USER.id, 'seed-write-stream');
  await seedThread(WRITE_USER.id, 'seed-write-exit');
  await seedThread(AUDIT_USER.id, 'seed-audit-1');
});

// ---------------------------------------------------------------------------
// 未登录 / 缺码拒绝路径
// ---------------------------------------------------------------------------

describe('consult-agent 权限门禁 · 未登录与越权拒绝', () => {
  for (const endpoint of ALL_ENDPOINTS) {
    it(`${endpoint.label}（${endpoint.method} ${endpoint.path}）：未登录 → 401 / 40100`, async () => {
      const result = await callRoute(endpoint, null);
      expect(result.status).toBe(401);
      expect(result.code).toBe(40100);
      expect(result.data).toBeNull();
    });

    it(`${endpoint.label}（${endpoint.method} ${endpoint.path}）：已登录缺码 → 403 / 40300`, async () => {
      const result = await callRoute(endpoint, NO_ROLE_USER);
      expect(result.status).toBe(403);
      expect(result.code).toBe(40300);
      expect(result.data).toBeNull();
    });
  }

  it('拒绝路径不执行仓储写操作：缺码创建会话不落库', async () => {
    const before = await sharedRepo.listThreads(NO_ROLE_USER.id);
    const result = await callRoute(WRITE_ENDPOINTS[0], NO_ROLE_USER);
    expect(result.status).toBe(403);
    expect(result.data).toBeNull();
    const after = await sharedRepo.listThreads(NO_ROLE_USER.id);
    expect(after.length).toBe(before.length);
  });

  it('拒绝路径不执行仓储写操作：缺码发送消息不产生新消息 / 草稿', async () => {
    const threadId = 'seed-write-msg';
    const messagesBefore = await sharedRepo.listMessages(threadId);
    const draftsBefore = await sharedRepo.listDrafts(threadId, 'diagnosis');
    const result = await callRoute(WRITE_ENDPOINTS[1], NO_ROLE_USER);
    expect(result.status).toBe(403);
    const messagesAfter = await sharedRepo.listMessages(threadId);
    const draftsAfter = await sharedRepo.listDrafts(threadId, 'diagnosis');
    expect(messagesAfter.length).toBe(messagesBefore.length);
    expect(draftsAfter.length).toBe(draftsBefore.length);
  });

  it('未登录创建会话不落库（空用户名下无会话）', async () => {
    await callRoute(WRITE_ENDPOINTS[0], null);
    const threads = await sharedRepo.listThreads('');
    expect(threads.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// read 码：持码放行；write / audit 码被拒
// ---------------------------------------------------------------------------

describe('consult-agent 权限门禁 · read 码隔离', () => {
  for (const endpoint of READ_ENDPOINTS) {
    it(`${endpoint.label}：持有 read 码通过权限闸（非 401/403）`, async () => {
      const result = await callRoute(endpoint, READ_USER);
      expect([400, 404, 200]).toContain(result.status);
      expect(result.status).not.toBe(401);
      expect(result.status).not.toBe(403);
    });
  }

  it('read 码读取规则快照：三条权限码与免责声明完整返回', async () => {
    const result = await callRoute(READ_ENDPOINTS[3], READ_USER);
    expect(result.status).toBe(200);
    const data = result.data as {
      permissions: { READ: string; WRITE: string; AUDIT: string };
      disclaimer: string;
    };
    expect(data.permissions.READ).toBe(CONSULT_AGENT_PERMISSIONS.READ);
    expect(data.permissions.WRITE).toBe(CONSULT_AGENT_PERMISSIONS.WRITE);
    expect(data.permissions.AUDIT).toBe(CONSULT_AGENT_PERMISSIONS.AUDIT);
    expect(data.disclaimer.length).toBeGreaterThan(0);
  });

  it('read 码读取画像：返回事实数组', async () => {
    const result = await callRoute(READ_ENDPOINTS[5], READ_USER);
    expect(result.status).toBe(200);
    expect(Array.isArray((result.data as { facts: unknown[] }).facts)).toBe(true);
  });

  for (const endpoint of WRITE_ENDPOINTS) {
    it(`read 码访问写端点「${endpoint.label}」→ 403`, async () => {
      const result = await callRoute(endpoint, READ_USER);
      expect(result.status).toBe(403);
      expect(result.code).toBe(40300);
    });
  }

  it('read 码访问审计轨迹 → 403', async () => {
    const result = await callRoute(AUDIT_ENDPOINT, READ_USER);
    expect(result.status).toBe(403);
    expect(result.code).toBe(40300);
  });
});

// ---------------------------------------------------------------------------
// write 码：持码放行；read / audit 码被拒
// ---------------------------------------------------------------------------

describe('consult-agent 权限门禁 · write 码隔离', () => {
  it('write 码创建会话：通过权限闸返回空闲会话', async () => {
    const result = await callRoute(WRITE_ENDPOINTS[0], WRITE_USER);
    expect(result.status).toBe(200);
    const thread = (result.data as { thread: { status: string } }).thread;
    expect(thread.status).toBe('idle');
  });

  it('write 码发送消息：通过权限闸进入编排（非 401/403）', async () => {
    const result = await callRoute(WRITE_ENDPOINTS[1], WRITE_USER);
    expect([200, 400, 404]).toContain(result.status);
    expect(result.status).not.toBe(401);
    expect(result.status).not.toBe(403);
  });

  it('write 码语音转写：通过权限闸返回归一化文本', async () => {
    const result = await callRoute(WRITE_ENDPOINTS[2], WRITE_USER);
    expect(result.status).toBe(200);
    expect(typeof (result.data as { text: string }).text).toBe('string');
  });

  it('write 码流式问诊：入参非法在权限闸之后返回 400（非 401/403）', async () => {
    const result = await callRoute(WRITE_ENDPOINTS[3], WRITE_USER);
    expect(result.status).toBe(400);
    expect(result.status).not.toBe(401);
    expect(result.status).not.toBe(403);
  });

  it('write 码退出会话：通过权限闸关闭线程', async () => {
    const result = await callRoute(WRITE_ENDPOINTS[4], WRITE_USER);
    expect(result.status).toBe(200);
    expect((result.data as { thread: { status: string } }).thread.status).toBe('closed');
  });

  for (const endpoint of READ_ENDPOINTS) {
    it(`write 码访问读端点「${endpoint.label}」→ 403`, async () => {
      const result = await callRoute(endpoint, WRITE_USER);
      expect(result.status).toBe(403);
      expect(result.code).toBe(40300);
    });
  }

  it('write 码访问审计轨迹 → 403', async () => {
    const result = await callRoute(AUDIT_ENDPOINT, WRITE_USER);
    expect(result.status).toBe(403);
    expect(result.code).toBe(40300);
  });
});

// ---------------------------------------------------------------------------
// audit 码：仅审计端点放行；read / write 端点被拒
// ---------------------------------------------------------------------------

describe('consult-agent 权限门禁 · audit 码隔离', () => {
  it('audit 码访问审计轨迹：通过权限闸返回条目数组', async () => {
    const result = await callRoute(AUDIT_ENDPOINT, AUDIT_USER);
    expect(result.status).toBe(200);
    expect(Array.isArray((result.data as { entries: unknown[] }).entries)).toBe(true);
  });

  for (const endpoint of READ_ENDPOINTS) {
    it(`audit 码访问读端点「${endpoint.label}」→ 403`, async () => {
      const result = await callRoute(endpoint, AUDIT_USER);
      expect(result.status).toBe(403);
      expect(result.code).toBe(40300);
    });
  }

  for (const endpoint of WRITE_ENDPOINTS) {
    it(`audit 码访问写端点「${endpoint.label}」→ 403`, async () => {
      const result = await callRoute(endpoint, AUDIT_USER);
      expect(result.status).toBe(403);
      expect(result.code).toBe(40300);
    });
  }
});

// ---------------------------------------------------------------------------
// 守卫直测：admin 直通 / 持码放行 / 缺码 403 / 未登录 401（与中间件签名一致）
// ---------------------------------------------------------------------------

describe('requirePermissionCode 守卫语义', () => {
  function guardCtx(user: FakeUser | null): Ctx {
    return {
      user:
        user === null
          ? null
          : { id: user.id, name: user.name, roles: user.roles, permissions: user.permissions },
      traceId: 'trc-perm-guard',
    } as Ctx;
  }

  it('admin 角色直通所有 consult 权限码', () => {
    for (const code of Object.values(CONSULT_AGENT_PERMISSIONS)) {
      expect(requirePermissionCode(guardCtx(ADMIN_USER), code)).toBeNull();
    }
  });

  it('持有精确权限码放行；持有其他 consult 码不放行', () => {
    expect(requirePermissionCode(guardCtx(READ_USER), CONSULT_AGENT_PERMISSIONS.READ)).toBeNull();
    expect(
      requirePermissionCode(guardCtx(READ_USER), CONSULT_AGENT_PERMISSIONS.WRITE),
    ).not.toBeNull();
    expect(requirePermissionCode(guardCtx(AUDIT_USER), CONSULT_AGENT_PERMISSIONS.AUDIT)).toBeNull();
  });

  it('未登录返回 401 响应（40100）', () => {
    const denied = requirePermissionCode(guardCtx(null), CONSULT_AGENT_PERMISSIONS.READ);
    expect(denied).not.toBeNull();
    expect(denied?.status).toBe(401);
  });

  it('缺码返回 403 响应（40300）', async () => {
    const denied = requirePermissionCode(guardCtx(NO_ROLE_USER), CONSULT_AGENT_PERMISSIONS.READ);
    expect(denied).not.toBeNull();
    if (!denied) {
      throw new Error('权限守卫未返回拒绝响应');
    }
    expect(denied.status).toBe(403);
    const payload = (await denied.json()) as { code: number };
    expect(payload.code).toBe(40300);
  });
});
