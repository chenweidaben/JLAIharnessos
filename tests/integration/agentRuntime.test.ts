/**
 * 健澜科技 jlmedaios - 智能体运行时 集成测试（M4-C）
 *
 * 直接对真实 PostgreSQL 运行聚合器（无 mock 执行结果；执行引擎为确定性演示引擎，
 * 已在响应中明确标注），覆盖：
 *  - 执行已发布智能体成功（状态 completed、输出、tokens、耗时）；
 *  - 节点执行记录（start/end 节点、状态、耗时）；
 *  - 执行不存在智能体 → 404；执行草稿（未发布）→ 409；
 *  - 执行指定版本；实例列表 / 详情（含节点）；
 *  - 并发执行多个实例（彼此独立、不串数据）；
 *  - 取消运行中实例（含 delay 工作流）；
 *  - BFF 路由信封：未认证 401、无权限 403。
 *
 * 隔离：唯一 agent 标识，afterAll 删除（级联版本/实例）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { verifyDbConnection } from '../../src/db/pool.js';
import { type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView } from '../../src/bff/view/userView.js';
import {
  publishDraft,
  removeBuilderAgent,
  saveDraft,
} from '../../src/bff/aggregators/agentBuilderAggregator.js';
import {
  AgentRuntimeError,
  cancelAgentRun,
  getAgentRun,
  listAgentRuns,
  startAgentRun,
} from '../../src/bff/aggregators/agentRuntimeAggregator.js';
import { agentRuntimeRoutes } from '../../src/bff/routes/agentRuntime.js';
import {
  WorkflowNodeType,
  type AgentPackage,
  type NodeDefinition,
} from '../../src/orchestrator/dsl/types.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let pharmacist: AuthView;

const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const simpleId = `m4c-simple-${runId}`;
const delayId = `m4c-delay-${runId}`;

/** 简单 start→end 智能体包 */
function makeSimplePackage(id: string): AgentPackage {
  const nodes: NodeDefinition[] = [
    { id: 'start', type: WorkflowNodeType.START, name: '开始', config: {} },
    {
      id: 'end',
      type: WorkflowNodeType.END,
      name: '结束',
      config: { outputMapping: { status: '"completed"', result: '"demo-ok"' } },
    },
  ];
  const edges = [{ id: 'e1', source: 'start', target: 'end' }];
  return {
    packageFormatVersion: '1.0.0',
    agent: {
      id,
      name: '运行时测试智能体',
      version: '1.0.0',
      category: '测试',
      tags: [],
      description: 'M4-C 集成测试',
      allowedRoles: ['doctor'],
      riskLevel: 'low',
      builtin: false,
      tools: [],
      knowledgeBases: [],
      model: { provider: 'jianlan', model: 'demo', temperature: 0.2 },
      systemPrompt: 'prompts/system.md',
      entryWorkflow: 'main',
      workflows: [{ meta: { id: 'main', name: 'main', version: '1.0.0' }, nodes, edges }],
      triggers: [],
      disclaimer: '本输出为临床辅助建议',
      enabled: true,
    },
    prompts: {},
    packagedAt: new Date().toISOString(),
    checksum: 'test-fixture',
  };
}

/** 含 delay 的智能体包（用于取消测试） */
function makeDelayPackage(id: string, delayMs: number): AgentPackage {
  const nodes: NodeDefinition[] = [
    { id: 'start', type: WorkflowNodeType.START, name: '开始', config: {} },
    { id: 'delay', type: WorkflowNodeType.DELAY, name: '延时', config: { durationMs: delayMs } },
    {
      id: 'end',
      type: WorkflowNodeType.END,
      name: '结束',
      config: { outputMapping: { status: 'completed' } },
    },
  ];
  const edges = [
    { id: 'e1', source: 'start', target: 'delay' },
    { id: 'e2', source: 'delay', target: 'end' },
  ];
  const pkg = makeSimplePackage(id);
  pkg.agent.workflows = [{ meta: { id: 'main', name: 'main', version: '1.0.0' }, nodes, edges }];
  return pkg;
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

if (dbAvailable) {
  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  pharmacist = await load('pharmacist_wang');

  // 准备并发布两个智能体
  await saveDraft(admin, makeSimplePackage(simpleId));
  await publishDraft(admin, simpleId);
  await saveDraft(admin, makeDelayPackage(delayId, 5000));
  await publishDraft(admin, delayId);
}

afterAll(async () => {
  if (!dbAvailable) return;
  for (const id of [simpleId, delayId]) {
    try {
      await removeBuilderAgent(admin, id);
    } catch {
      /* 已删除则忽略 */
    }
  }
});

describe('M4-C 智能体运行时（真实 PostgreSQL）', () => {
  if (!dbAvailable) {
    it.skip('数据库不可用，跳过（不冒充通过）', () => {});
    return;
  }

  it('执行已发布智能体成功（completed + 输出 + 耗时）', async () => {
    const res = await startAgentRun(admin, simpleId, { input: { question: '测试' } });
    expect(res.instance.state).toBe('completed');
    expect(res.instance.durationMs).not.toBeNull();
    expect(res.instance.durationMs).toBeGreaterThanOrEqual(0);
    expect(res.instance.output).not.toBeNull();
    expect(res.instance.output?.status).toBe('completed');
    expect(res.instance.output?.result).toBe('demo-ok');
    expect(res.instance.traceId).toMatch(/^trace_/);
    expect(res.instance.instanceNo).toMatch(/^WIN/);
  });

  it('节点执行记录完整（start/end，状态/耗时）', async () => {
    const res = await startAgentRun(admin, simpleId);
    const nodeIds = res.nodes.map((n) => n.nodeId).sort();
    expect(nodeIds).toEqual(['end', 'start']);
    for (const n of res.nodes) {
      expect(n.state).toBe('completed');
      expect(n.attempts).toBeGreaterThanOrEqual(1);
    }
    const endNode = res.nodes.find((n) => n.nodeId === 'end');
    expect(endNode?.output).not.toBeNull();
  });

  it('执行不存在的智能体 → 404', async () => {
    let caught: unknown = null;
    try {
      await startAgentRun(admin, 'no-such-agent-xyz');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AgentRuntimeError);
    expect((caught as AgentRuntimeError).status).toBe(404);
  });

  it('执行未发布版本 → 409', async () => {
    let caught: unknown = null;
    try {
      await startAgentRun(admin, simpleId, { version: '9.9.9' });
    } catch (e) {
      caught = e;
    }
    expect((caught as AgentRuntimeError).status).toBe(409);
  });

  it('执行指定版本成功', async () => {
    const res = await startAgentRun(admin, simpleId, { version: '1.0.0' });
    expect(res.instance.state).toBe('completed');
    expect(res.instance.agentVersion).toBe('1.0.0');
  });

  it('实例列表包含测试智能体的运行记录', async () => {
    const list = await listAgentRuns(admin, { agentId: simpleId });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.every((i) => i.agentId === simpleId)).toBe(true);
  });

  it('实例详情含节点记录', async () => {
    const created = await startAgentRun(admin, simpleId);
    const detail = await getAgentRun(admin, created.instance.id);
    expect(detail.instance.id).toBe(created.instance.id);
    expect(detail.nodes.length).toBeGreaterThanOrEqual(2);
  });

  it('并发执行多个实例（彼此独立、不串数据）', async () => {
    const results = await Promise.all([
      startAgentRun(admin, simpleId, { input: { n: 1 } }),
      startAgentRun(admin, simpleId, { input: { n: 2 } }),
      startAgentRun(admin, simpleId, { input: { n: 3 } }),
    ]);
    const ids = results.map((r) => r.instance.id);
    expect(new Set(ids).size).toBe(3);
    expect(results.every((r) => r.instance.state === 'completed')).toBe(true);
    // 每个实例的输入独立
    const byInput = results.map((r) => r.instance.input.n);
    expect(byInput.sort()).toEqual([1, 2, 3]);
  });

  it('取消运行中实例（delay 工作流）', async () => {
    // 发起执行但不等待，让实例进入 running
    const pending = startAgentRun(admin, delayId, { timeoutMs: 15_000 });
    // 等待实例落库并进入延时
    await new Promise((r) => setTimeout(r, 600));
    const running = await listAgentRuns(admin, { agentId: delayId, state: 'running' });
    expect(running.length).toBeGreaterThanOrEqual(1);
    const target = running[0];
    await cancelAgentRun(admin, target.id, '集成测试取消');
    // 取消后 sleep 立即中断，执行 promise 以 cancelled 失败结束
    await pending.catch(() => {
      /* 预期：cancelled 导致 startAgentRun 抛错 */
    });
    const detail = await getAgentRun(admin, target.id);
    expect(detail.instance.state).toBe('cancelled');
  });

  it('BFF 路由：未认证 → 401', async () => {
    const route = agentRuntimeRoutes.find(
      (r) => r.method === 'GET' && r.path === '/api/v1/agent-runtime/instances',
    )!;
    const res = await route.handle({
      user: null,
      query: new URLSearchParams(),
      params: {},
    } as unknown as Ctx);
    expect(res.status).toBe(401);
  });

  it('BFF 路由：药师无 agent:build → 403', async () => {
    const route = agentRuntimeRoutes.find(
      (r) => r.method === 'GET' && r.path === '/api/v1/agent-runtime/instances',
    )!;
    const res = await route.handle({
      user: { id: pharmacist.id, roles: pharmacist.rawRoles },
      query: new URLSearchParams(),
      params: {},
    } as unknown as Ctx);
    expect(res.status).toBe(403);
  });

  it('BFF 路由：触发执行未认证 → 401', async () => {
    const route = agentRuntimeRoutes.find(
      (r) =>
        r.method === 'POST' &&
        r.path === '/api/v1/agent-runtime/agents/:agentId/run',
    )!;
    const res = await route.handle({
      user: null,
      params: { agentId: simpleId },
      body: async () => ({}),
    } as unknown as Ctx);
    expect(res.status).toBe(401);
  });
});
