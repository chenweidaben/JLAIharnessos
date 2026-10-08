/**
 * 健澜科技 jlmedaios - 人工在环（Human-in-the-loop）集成测试（M4-D）
 *
 * 直接对真实 PostgreSQL 运行聚合器（无 mock 执行结果），覆盖：
 *  - 工作流执行到 human 节点：实例进入 waiting_human，startAgentRun 立即返回不阻塞；
 *  - 工单落库（任务标题/说明/审核角色/审核上下文）；
 *  - 认领（pending→claimed）；重复认领/他人认领 → 409；
 *  - 批准并签名：工作流继续执行到 completed，工单 resolution approved=true；
 *  - 驳回：工单 resolution approved=false（工作流按 condition 分支，本测试用单 out）；
 *  - 重复处理已完成工单 → 409；
 *  - 越权：不在审核范围的角色处理 → 403；
 *  - 取消 waiting_human 实例：工单一并 cancelled；
 *  - 整体超时未处理：实例 timed_out，工单一并 timeout（不残留 pending）；
 *  - BFF 路由信封：未认证 401。
 *
 * 隔离：唯一 agent 标识，afterAll 删除（级联版本/实例/工单）。
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
  startAgentRun,
  listMyHumanTasks,
  getHumanTask,
  claimMyHumanTask,
  resolveMyHumanTask,
} from '../../src/bff/aggregators/agentRuntimeAggregator.js';
import { agentRuntimeRoutes } from '../../src/bff/routes/agentRuntime.js';
import {
  WorkflowNodeType,
  type AgentPackage,
  type NodeDefinition,
} from '../../src/orchestrator/dsl/types.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let doctor: AuthView;
let pharmacist: AuthView;

const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const humanId = `m4d-human-${runId}`;

/** 含 human 节点的智能体包：start → human → end */
function makeHumanPackage(id: string): AgentPackage {
  const nodes: NodeDefinition[] = [
    { id: 'start', type: WorkflowNodeType.START, name: '开始', config: {} },
    {
      id: 'human',
      type: WorkflowNodeType.HUMAN,
      name: '人工审核',
      config: {
        title: '高风险操作确认',
        instructions: '请核对以下内容，确认是否继续执行。',
        assigneeRoles: ['admin'],
      },
    },
    {
      id: 'end',
      type: WorkflowNodeType.END,
      name: '结束',
      config: { outputMapping: { status: '"completed"' } },
    },
  ];
  const edges = [
    { id: 'e1', source: 'start', target: 'human' },
    { id: 'e2', source: 'human', target: 'end' },
  ];
  const pkg: AgentPackage = {
    packageFormatVersion: '1.0.0',
    agent: {
      id,
      name: '人工在环测试智能体',
      version: '1.0.0',
      category: '测试',
      tags: [],
      description: 'M4-D 集成测试',
      allowedRoles: ['doctor'],
      riskLevel: 'high',
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
  doctor = await load('doctor_li');
  pharmacist = await load('pharmacist_wang');

  await saveDraft(admin, makeHumanPackage(humanId));
  await publishDraft(admin, humanId);
}

afterAll(async () => {
  if (!dbAvailable) return;
  try {
    await removeBuilderAgent(admin, humanId);
  } catch {
    /* 已删除则忽略 */
  }
});

describe.skipIf(!dbAvailable || !realMode)('M4-D 人工在环（真实 PostgreSQL）', () => {
  if (!dbAvailable) {
    it.skip('数据库不可用，跳过（不冒充通过）', () => {});
    return;
  }

  it('执行到 human 节点：实例 waiting_human，立即返回不阻塞', async () => {
    const started = Date.now();
    const res = await startAgentRun(admin, humanId, { timeoutMs: 30_000 });
    // 应在毫秒级返回（没有阻塞等待人工）
    expect(Date.now() - started).toBeLessThan(2000);
    expect(res.instance.state).toBe('waiting_human');
    expect(res.nodes.some((n) => n.nodeId === 'human')).toBe(true);
  });

  it('工单落库：标题/说明/审核角色/审核上下文', async () => {
    const tasks = await listMyHumanTasks(admin, { status: 'pending' });
    const mine = tasks.filter((t) => t.instanceId && t.title === '高风险操作确认');
    expect(mine.length).toBeGreaterThanOrEqual(1);
    const t = mine[mine.length - 1];
    expect(t.assigneeRoles).toContain('admin');
    expect(t.instructions).toContain('核对');
    expect(Array.isArray(t.reviewData)).toBe(true);
  });

  it('认领工单（pending→claimed），并带出关联实例', async () => {
    const tasks = await listMyHumanTasks(admin, { status: 'pending' });
    const t = tasks[tasks.length - 1];
    const detail = await claimMyHumanTask(admin, t.id);
    expect(detail.task.status).toBe('claimed');
    expect(detail.task.claimedBy).toBe(admin.id);
    expect(detail.instance).not.toBeNull();
  });

  it('重复认领已认领工单 → 409', async () => {
    const tasks = await listMyHumanTasks(admin, { status: 'claimed' });
    const t = tasks[tasks.length - 1];
    let caught: unknown = null;
    try {
      await claimMyHumanTask(admin, t.id);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AgentRuntimeError);
    expect((caught as AgentRuntimeError).status).toBe(409);
  });

  it('批准并签名：工作流继续到 completed，工单 approved=true', async () => {
    const tasks = await listMyHumanTasks(admin, { status: 'claimed' });
    const t = tasks[tasks.length - 1];
    const detail = await resolveMyHumanTask(admin, t.id, {
      approved: true,
      comment: '确认无误',
    });
    expect(detail.task.status).toBe('resolved');
    expect(detail.task.resolution?.approved).toBe(true);
    expect(detail.task.resolvedBy).toBe(admin.id);

    // 等待后台工作流完成
    let finalState = '';
    for (let i = 0; i < 40; i++) {
      const run = await getAgentRun(admin, t.instanceId);
      finalState = run.instance.state;
      if (finalState === 'completed') break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(finalState).toBe('completed');
  });

  it('驳回场景：工单 resolution approved=false', async () => {
    // 新发起一次，走驳回
    const res = await startAgentRun(admin, humanId, { timeoutMs: 30_000 });
    const tasks = await listMyHumanTasks(admin, { status: 'pending' });
    const t = tasks.find((x) => x.instanceId === res.instance.id)!;
    await claimMyHumanTask(admin, t.id);
    const detail = await resolveMyHumanTask(admin, t.id, {
      approved: false,
      comment: '存在风险，驳回',
    });
    expect(detail.task.resolution?.approved).toBe(false);
    expect(detail.task.resolution?.comment).toBe('存在风险，驳回');
  });

  it('重复处理已 resolved 工单 → 409', async () => {
    const tasks = await listMyHumanTasks(admin, { status: 'resolved' });
    const t = tasks[tasks.length - 1];
    let caught: unknown = null;
    try {
      await resolveMyHumanTask(admin, t.id, { approved: true });
    } catch (e) {
      caught = e;
    }
    expect((caught as AgentRuntimeError).status).toBe(409);
  });

  it('越权：不在审核范围的药师处理 → 403', async () => {
    // 发起一个等待 admin 的工单
    const res = await startAgentRun(admin, humanId, { timeoutMs: 30_000 });
    const tasks = await listMyHumanTasks(admin, { status: 'pending' });
    const t = tasks.find((x) => x.instanceId === res.instance.id)!;
    let caught: unknown = null;
    try {
      // 药师不在 assigneeRoles（admin）范围内
      await resolveMyHumanTask(pharmacist, t.id, { approved: true });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AgentRuntimeError);
    expect((caught as AgentRuntimeError).status).toBe(403);
  });

  it('工单详情：404 不存在', async () => {
    let caught: unknown = null;
    try {
      await getHumanTask(admin, '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      caught = e;
    }
    expect((caught as AgentRuntimeError).status).toBe(404);
  });

  it('取消 waiting_human 实例：工单一并 cancelled', async () => {
    const res = await startAgentRun(admin, humanId, { timeoutMs: 30_000 });
    const tasks = await listMyHumanTasks(admin, { status: 'pending' });
    const t = tasks.find((x) => x.instanceId === res.instance.id)!;
    await cancelAgentRun(admin, res.instance.id, '测试取消');
    // 工单应被置为 cancelled
    const cancelled = await listMyHumanTasks(admin, { status: 'cancelled' });
    expect(cancelled.some((x) => x.id === t.id)).toBe(true);
  });

  it('整体超时未处理：实例 timed_out，工单一并 timeout', async () => {
    // 发起一个整体超时很短（900ms）的 run，不处理工单
    const res = await startAgentRun(admin, humanId, { timeoutMs: 900 });
    // 等待实例整体超时并由后台 finalize 落库
    let finalState = '';
    for (let i = 0; i < 50; i++) {
      const run = await getAgentRun(admin, res.instance.id);
      finalState = run.instance.state;
      if (finalState === 'timed_out') break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(finalState).toBe('timed_out');
    // 未完成工单应被同步置为 timeout，不残留 pending
    const timeoutTasks = await listMyHumanTasks(admin, { status: 'timeout' });
    expect(timeoutTasks.some((x) => x.instanceId === res.instance.id)).toBe(true);
    const pending = await listMyHumanTasks(admin, { status: 'pending' });
    expect(pending.some((x) => x.instanceId === res.instance.id)).toBe(false);
  });

  it('BFF 路由：工单列表未认证 → 401', async () => {
    const route = agentRuntimeRoutes.find(
      (r) => r.method === 'GET' && r.path === '/api/v1/human-tasks',
    )!;
    const res = await route.handle({
      user: null,
      query: new URLSearchParams(),
      params: {},
    } as unknown as Ctx);
    expect(res.status).toBe(401);
  });

  it('BFF 路由：resolve 缺 approved 字段 → 400', async () => {
    const route = agentRuntimeRoutes.find(
      (r) => r.method === 'POST' && r.path === '/api/v1/human-tasks/:taskId/resolve',
    )!;
    const res = await route.handle({
      user: { id: admin.id, roles: admin.rawRoles },
      params: { taskId: 'x' },
      body: async () => ({}),
    } as unknown as Ctx);
    expect(res.status).toBe(400);
  });
});
