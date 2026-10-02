/**
 * 健澜科技 jlmedaios - 智能体运行时聚合器（M4-C）
 *
 * 执行已发布智能体，并把运行实例、节点执行记录、用量日志完整持久化：
 *  - 加载指定版本（缺省最新已发布）的 AgentDefinition；
 *  - 装配可插拔运行时（本切片为确定性本地演示引擎，明确标注，不冒充真实模型；
 *    工具/知识库由智能体声明，演示引擎提供确定性兜底，不臆造医疗结论）；
 *  - 执行开始即落 running 实例；执行后按节点 upsert 记录并回写终态；
 *  - 实例终态、节点记录、用量与哈希链审计在同一事务内提交。
 *
 * 安全边界：
 *  - 执行经 agent:build（或 agent:run）权限（路由层强制）；
 *  - 只有已启用（enabled）的智能体可执行；停用/草稿态拒绝；
 *  - 整体超时（默认 30s）防止异常工作流长时间挂起；
 *  - 输出为临床辅助，演示结果明确标注，不能替代医生诊断。
 *
 * 人工在环（human 节点工单）、真实 LLM/工具接入由后续切片完成。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

import { withTx, type TransactionSql } from '../../db/pool.js';
import {
  getAgentByAgentId,
  getVersion,
  getLatestPublishedVersion,
} from '../../db/repositories/agentBuilderRepo.js';
import {
  insertRunningInstance,
  updateInstanceTerminal,
  listInstances,
  getInstanceById,
  upsertNodeRecord,
  listNodeRecords,
  insertInvocation,
  type WorkflowInstanceRecord,
  type NodeRecord,
} from '../../db/repositories/agentRuntimeRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { createMockRuntimeDeps, MockRagRetriever } from '../../orchestrator/adapters/mockRuntime.js';
import { InMemoryHumanTaskHandler } from '../../orchestrator/engine/humanTaskHandler.js';
import { createOrchestrator, type Orchestrator } from '../../orchestrator/factory.js';
import type { AgentDefinition } from '../../orchestrator/dsl/types.js';
import type { AuthView } from '../view/userView.js';

export class AgentRuntimeError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AgentRuntimeError';
  }
}

const badRequest = (m: string) => new AgentRuntimeError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new AgentRuntimeError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new AgentRuntimeError(409, 'CONFLICT', m);

/** 默认整体执行超时（毫秒） */
const DEFAULT_TIMEOUT_MS = 30_000;

/** 运行中实例句柄（用于取消）：instanceId -> WorkflowInstance */
const liveHandles = new Map<string, ReturnType<Orchestrator['engine']['run']>>();

// ============================================================================
// 视图模型
// ============================================================================

export interface RunDetail {
  instance: WorkflowInstanceRecord;
  nodes: NodeRecord[];
}

// ============================================================================
// 执行
// ============================================================================

/**
 * 触发执行已发布智能体。
 * @param body { version?, input?, timeoutMs?, patientRef? }
 */
export async function startAgentRun(
  actor: AuthView,
  agentId: string,
  body: {
    version?: string;
    input?: Record<string, unknown>;
    timeoutMs?: number;
    patientRef?: string;
  } = {},
): Promise<RunDetail> {
  const agent = await getAgentByAgentId(agentId);
  if (!agent) throw notFound('智能体不存在');
  if (agent.status !== 'enabled') {
    throw conflict(`智能体当前状态为 ${agent.status}，只有已启用的智能体可执行`);
  }

  // 加载目标版本（指定版本 > 最新已发布）
  const versionRecord = body.version
    ? await getVersion(agentId, body.version)
    : await getLatestPublishedVersion(agentId);
  if (!versionRecord || !versionRecord.published) {
    throw conflict(body.version ? `版本 ${body.version} 不存在或未发布` : '智能体尚无已发布版本');
  }
  const agentDef = versionRecord.definition as unknown as AgentDefinition;

  const runInput = body.input ?? {};
  const timeoutMs = body.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const triggerType = 'manual';
  const traceId = `trace_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  // 执行开始即落 running 实例
  const instance = await insertRunningInstance({
    agentId,
    agentVersion: versionRecord.version,
    workflowId: agentDef.entryWorkflow,
    triggerType,
    traceId,
    input: runInput,
    actorId: actor.id,
    patientRef: body.patientRef ?? null,
  });

  // 装配确定性演示运行时（注册智能体声明的工具/知识库兜底）
  const orchestrator = buildDemoOrchestrator(agentDef);
  orchestrator.registry.register(agentDef, versionRecord.prompts as Record<string, string>);

  const wf = agentDef.workflows.find((w) => w.meta.id === agentDef.entryWorkflow);
  if (!wf) {
    await finalizeFailure(instance, agentId, versionRecord.version, actor, triggerType, traceId, '入口工作流不存在');
    throw conflict('入口工作流不存在');
  }

  const startedAt = Date.now();
  const handle = orchestrator.engine.run(wf, {
    input: runInput,
    timeoutMs,
    trigger: { type: triggerType, traceId, userId: actor.id },
    runtimeOverride: {
      promptLoader: (ref: string) => versionRecord.prompts[ref] ?? ref,
    },
  });
  liveHandles.set(instance.id, handle);

  let result;
  try {
    result = await handle.result;
  } finally {
    liveHandles.delete(instance.id);
  }
  const latencyMs = Date.now() - startedAt;

  // 从事件提取节点记录
  const nodeRecords = extractNodeRecords(result.events, instance.id);

  if (result.success) {
    await withTx(async (tx) => {
      for (const n of nodeRecords) await persistNodeRecord(instance.id, n, tx);
      await updateInstanceTerminal(
        instance.id,
        {
          state: 'completed',
          output: (result.output ?? null) as Record<string, unknown> | null,
          tokensIn: result.summary.tokens.input,
          tokensOut: result.summary.tokens.output,
          durationMs: latencyMs,
        },
        tx,
      );
      await insertInvocation(
        {
          traceId,
          agentId,
          agentVersion: versionRecord.version,
          actorId: actor.id,
          triggerType,
          status: 'success',
          tokensIn: result.summary.tokens.input,
          tokensOut: result.summary.tokens.output,
          latencyMs,
        },
        tx,
      );
      await recordChainAudit(
        {
          actorId: actor.id,
          action: 'agent.run',
          resourceType: 'agent',
          resourceId: agentId,
          result: 'success',
          riskLevel: agent.riskLevel === 'high' ? 'medium' : 'low',
          detail: { version: versionRecord.version, durationMs: latencyMs, instanceNo: instance.instanceNo },
        },
        tx,
      );
    });
  } else {
    const isCancelled = result.state === 'cancelled';
    const isTimedOut = /超时|timeout/i.test(result.error ?? '');
    const finalState = isCancelled ? 'cancelled' : isTimedOut ? 'timed_out' : 'failed';
    await withTx(async (tx) => {
      for (const n of nodeRecords) await persistNodeRecord(instance.id, n, tx);
      await updateInstanceTerminal(
        instance.id,
        {
          state: finalState,
          output: null,
          errorCode: isTimedOut ? 'TIMEOUT' : 'RUN_FAILED',
          errorMessage: result.error ?? '执行失败',
          tokensIn: result.summary.tokens.input,
          tokensOut: result.summary.tokens.output,
          durationMs: latencyMs,
        },
        tx,
      );
      await insertInvocation(
        {
          traceId,
          agentId,
          agentVersion: versionRecord.version,
          actorId: actor.id,
          triggerType,
          status: isCancelled ? 'cancelled' : 'failed',
          tokensIn: result.summary.tokens.input,
          tokensOut: result.summary.tokens.output,
          latencyMs,
          errorCode: isTimedOut ? 'TIMEOUT' : 'RUN_FAILED',
        },
        tx,
      );
      await recordChainAudit(
        {
          actorId: actor.id,
          action: 'agent.run',
          resourceType: 'agent',
          resourceId: agentId,
          result: 'failure',
          riskLevel: 'medium',
          detail: { version: versionRecord.version, error: result.error, instanceNo: instance.instanceNo },
        },
        tx,
      );
    });
  }

  const refreshed = await getInstanceById(instance.id);
  const nodes = await listNodeRecords(instance.id);
  return { instance: refreshed ?? instance, nodes };
}

// ============================================================================
// 查询 / 取消
// ============================================================================

/** 列出运行实例（可按 agentId / state 过滤） */
export async function listAgentRuns(
  actor: AuthView,
  filter: { agentId?: string; state?: string; limit?: number } = {},
): Promise<WorkflowInstanceRecord[]> {
  return listInstances(filter);
}

/** 获取运行实例详情（含节点记录） */
export async function getAgentRun(actor: AuthView, instanceId: string): Promise<RunDetail> {
  const instance = await getInstanceById(instanceId);
  if (!instance) throw notFound('运行实例不存在');
  const nodes = await listNodeRecords(instanceId);
  return { instance, nodes };
}

/** 取消运行中实例 */
export async function cancelAgentRun(actor: AuthView, instanceId: string, reason?: string): Promise<RunDetail> {
  const instance = await getInstanceById(instanceId);
  if (!instance) throw notFound('运行实例不存在');
  const handle = liveHandles.get(instanceId);
  if (handle) {
    handle.cancel(reason ?? '用户取消');
    // 等待工作流进入终态（startAgentRun 负责持久化终态）
    await handle.result.catch(() => {});
    // 轮询等待终态落库，确保返回最终状态而非 running
    for (let i = 0; i < 20; i++) {
      const current = await getInstanceById(instanceId);
      if (current && current.state !== 'running' && current.state !== 'pending') break;
      await new Promise((r) => setTimeout(r, 150));
    }
  } else if (instance.state === 'running') {
    // 句柄已不在内存（如 BFF 重启）：直接回写取消态
    await withTx(async (tx) => {
      await updateInstanceTerminal(
        instanceId,
        { state: 'cancelled', output: null, errorCode: 'CANCELLED', errorMessage: reason ?? '已取消' },
        tx,
      );
      await recordChainAudit(
        {
          actorId: actor.id,
          action: 'agent.run.cancel',
          resourceType: 'agent',
          resourceId: instance.agentId,
          result: 'success',
          riskLevel: 'low',
          detail: { instanceNo: instance.instanceNo },
        },
        tx,
      );
    });
  }
  const refreshed = await getInstanceById(instanceId);
  const nodes = await listNodeRecords(instanceId);
  return { instance: refreshed ?? instance, nodes };
}

// ============================================================================
// 辅助
// ============================================================================

/** 装配确定性演示运行时：为智能体声明的工具/知识库注册可重复的兜底实现 */
function buildDemoOrchestrator(agentDef: AgentDefinition): Orchestrator {
  const deps = createMockRuntimeDeps();

  // 注册智能体声明的工具：演示兜底（成功，不臆造医疗数据）
  for (const toolName of agentDef.tools ?? []) {
    deps.tools.registerTool(
      toolName,
      () => ({
        success: true,
        data: { demo: true, note: `（演示）工具 ${toolName} 已执行，非真实结果`, toolName },
      }),
      { riskLevel: 'low' },
    );
  }

  // 注册智能体声明的知识库：登记并加入一条演示文档
  const rag = deps.rag as MockRagRetriever;
  for (const kbName of agentDef.knowledgeBases ?? []) {
    rag.addKnowledgeBase(kbName);
    rag.addDoc({
      kb: kbName,
      id: `demo_${kbName}`,
      title: `（演示）${kbName} 知识片段`,
      source: 'local-demo',
      authorityLevel: 'general',
      content: `（演示）${kbName} 的确定性知识片段，用于流程演示，非真实医学证据。`,
    });
  }

  return createOrchestrator({ runtime: { ...deps, human: new InMemoryHumanTaskHandler() } });
}

/** 节点聚合中间结构 */
interface NodeAggregate {
  nodeId: string;
  nodeType: string;
  state: string;
  attempts: number;
  output: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number | null;
}

/** 从执行事件按节点聚合节点记录 */
function extractNodeRecords(events: readonly unknown[], instanceId: string): NodeAggregate[] {
  const byNode = new Map<string, NodeAggregate>();
  const startedAtByNode = new Map<string, number>();

  const ensure = (nodeId: string, type: string): NodeAggregate => {
    let agg = byNode.get(nodeId);
    if (!agg) {
      agg = {
        nodeId,
        nodeType: type,
        state: 'running',
        attempts: 0,
        output: null,
        errorCode: null,
        errorMessage: null,
        durationMs: null,
      };
      byNode.set(nodeId, agg);
    }
    return agg;
  };

  for (const raw of events) {
    const e = raw as {
      type: string;
      nodeId?: string;
      timestamp: number;
      payload?: {
        attempt?: number;
        type?: string;
        output?: unknown;
        error?: string;
      };
    };
    if (!e.nodeId) continue;
    const nodeType = e.payload?.type ?? '';
    const agg = ensure(e.nodeId, nodeType);

    if (e.type === 'node_started') {
      agg.attempts = Math.max(agg.attempts, e.payload?.attempt ?? 1);
      if (!startedAtByNode.has(e.nodeId)) startedAtByNode.set(e.nodeId, e.timestamp);
    } else if (e.type === 'node_completed') {
      agg.state = 'completed';
      agg.output = clampPayload(e.payload?.output);
      const started = startedAtByNode.get(e.nodeId);
      agg.durationMs = started ? e.timestamp - started : null;
    } else if (e.type === 'node_failed') {
      agg.state = 'failed';
      agg.attempts = Math.max(agg.attempts, e.payload?.attempt ?? agg.attempts);
      agg.errorCode = 'NODE_FAILED';
      agg.errorMessage = e.payload?.error ?? '节点执行失败';
      const started = startedAtByNode.get(e.nodeId);
      agg.durationMs = started ? e.timestamp - started : null;
    } else if (e.type === 'node_skipped') {
      agg.state = 'skipped';
      const started = startedAtByNode.get(e.nodeId);
      agg.durationMs = started ? e.timestamp - started : null;
    } else if (e.type === 'node_retrying') {
      agg.attempts = Math.max(agg.attempts, (e.payload?.attempt ?? 0) + 1);
    }
  }

  return [...byNode.values()];
}

/** 限制节点输出大小，避免超大 jsonb（超过约 8KB 则截断并标注） */
function clampPayload(output: unknown): Record<string, unknown> | null {
  if (output == null) return null;
  if (typeof output !== 'object') return { value: String(output) };
  try {
    const json = JSON.stringify(output);
    if (json.length <= 8000) return output as Record<string, unknown>;
    return { _truncated: true, preview: json.slice(0, 2000) };
  } catch {
    return { _unserializable: true };
  }
}

/** 持久化单条节点记录（在给定事务内） */
async function persistNodeRecord(
  instanceId: string,
  n: NodeAggregate,
  tx: TransactionSql,
): Promise<void> {
  await upsertNodeRecord(
    {
      instanceId,
      nodeId: n.nodeId,
      nodeType: n.nodeType,
      state: n.state,
      attempts: n.attempts,
      output: n.output,
      errorCode: n.errorCode,
      errorMessage: n.errorMessage,
      durationMs: n.durationMs,
    },
    tx,
  );
}

/** 执行失败但无 result 时的兜底回写（如入口工作流缺失） */
async function finalizeFailure(
  instance: WorkflowInstanceRecord,
  agentId: string,
  version: string,
  actor: AuthView,
  triggerType: string,
  traceId: string,
  error: string,
): Promise<void> {
  await withTx(async (tx) => {
    await updateInstanceTerminal(
      instance.id,
      { state: 'failed', output: null, errorCode: 'RUN_FAILED', errorMessage: error },
      tx,
    );
    await insertInvocation(
      {
        traceId,
        agentId,
        agentVersion: version,
        actorId: actor.id,
        triggerType,
        status: 'failed',
        tokensIn: 0,
        tokensOut: 0,
        latencyMs: 0,
        errorCode: 'RUN_FAILED',
      },
      tx,
    );
  });
}
