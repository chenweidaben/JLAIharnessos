/**
 * 健澜科技杠OS - 工作流引擎（核心解释器）
 *
 * WorkflowEngine 是编排层的运行时核心，以"递归下降解释器"方式执行 DAG 工作流：
 *   - 主路径从 start 节点沿出边逐节点执行，condition 按所选端口路由；
 *   - loop / parallel 节点通过 PathRunner 递归执行循环体/并行分支子路径；
 *   - 节点级能力：重试（指数退避）、超时、降级（fallback）、错误传播；
 *   - 实例级能力：暂停/恢复（节点边界，安全）、取消（AbortSignal）、人工挂起；
 *   - 全过程通过 ExecutionRecorder 记录事件，供画布回放与审计。
 *
 * 引擎本身无状态、可并发运行多个工作流实例：所有实例态（上下文/状态机/记录器/
 * 取消信号/暂停门）均通过 PathDeps 在调用链上显式传递，绝不挂在引擎实例字段上。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import {
  WorkflowNodeType,
  WorkflowState,
  type EdgeDefinition,
  type NodeDefinition,
  type RetryPolicy,
  type WorkflowDefinition,
} from '../dsl/types.js';
import { validateWorkflow, type ReferenceResolver } from './validator.js';
import { WorkflowContext, type TriggerInfo } from './context.js';
import { WorkflowStateMachine, IllegalStateTransitionError } from './state.js';
import { ExecutionRecorder, ExecutionEventType } from './recorder.js';
import { getDefaultNodeExecutorRegistry, type NodeExecutorRegistry } from '../nodes/registry.js';
import type {
  NodeExecutorContext,
  NodeOutcome,
  PathRunner,
  PathRunResult,
} from '../nodes/types.js';
import { WorkflowCancelledError } from '../nodes/types.js';
import type { WorkflowRuntime } from './runtime.js';
import { defaultSleep } from './runtime.js';

/** 工作流执行错误 */
export class WorkflowExecutionError extends Error {
  constructor(
    public readonly nodeId: string,
    message: string,
  ) {
    super(`节点 ${nodeId} 执行失败: ${message}`);
    this.name = 'WorkflowExecutionError';
  }
}

/** 工作流运行入参 */
export interface WorkflowRunOptions {
  input?: Record<string, unknown>;
  patient?: Record<string, unknown>;
  user?: Record<string, unknown>;
  trigger?: Partial<TriggerInfo>;
  runtimeOverride?: Partial<WorkflowRuntime>;
  timeoutMs?: number;
  instanceId?: string;
}

/** 工作流运行结果 */
export interface WorkflowRunResult {
  success: boolean;
  instanceId: string;
  traceId: string;
  state: WorkflowState;
  output?: unknown;
  error?: string;
  summary: ReturnType<ExecutionRecorder['summarize']>;
  events: ReturnType<ExecutionRecorder['getEvents']>;
}

/** 工作流实例控制句柄 */
export interface WorkflowInstance {
  instanceId: string;
  traceId: string;
  result: Promise<WorkflowRunResult>;
  getState(): WorkflowState;
  pause(): void;
  resume(): void;
  cancel(reason?: string): void;
  recorder: ExecutionRecorder;
  context: WorkflowContext;
}

/** 单次执行在调用链上传递的全部依赖 */
interface PathDeps {
  nodeMap: Map<string, NodeDefinition>;
  outgoing: Map<string, EdgeDefinition[]>;
  ctx: WorkflowContext;
  runtime: WorkflowRuntime;
  recorder: ExecutionRecorder;
  abortController: AbortController;
  stateMachine: WorkflowStateMachine;
  ncBase: Omit<NodeExecutorContext, 'signal'>;
  gateIfPaused: () => Promise<void>;
}

/** 节点执行内部结果（带降级跳转） */
interface InternalOutcome extends NodeOutcome {
  fallbackNodeId?: string;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 工作流引擎（无状态，可并发执行多实例）
 */
export class WorkflowEngine {
  private readonly executors: NodeExecutorRegistry;
  private readonly resolver: ReferenceResolver;
  private readonly baseRuntime: WorkflowRuntime;

  constructor(params: {
    runtime: WorkflowRuntime;
    resolver: ReferenceResolver;
    executors?: NodeExecutorRegistry;
  }) {
    this.baseRuntime = params.runtime;
    this.resolver = params.resolver;
    this.executors = params.executors ?? getDefaultNodeExecutorRegistry();
  }

  /** 启动工作流实例（异步执行，立即返回控制句柄） */
  run(wf: WorkflowDefinition, options: WorkflowRunOptions = {}): WorkflowInstance {
    const instanceId = options.instanceId ?? genId('wf');
    const traceId = options.trigger?.traceId ?? genId('trace');
    const recorder = new ExecutionRecorder(instanceId, wf.meta.id, traceId);

    // ---- 加载期校验 ----
    const validation = validateWorkflow(wf, this.resolver);
    if (!validation.valid) {
      const errorMessages = validation.issues
        .filter((i) => i.severity === 'error')
        .map((i) => `[${i.code}] ${i.message}`)
        .join('; ');
      recorder.record(ExecutionEventType.WORKFLOW_FAILED, { reason: errorMessages });
      const failedResult: WorkflowRunResult = {
        success: false,
        instanceId,
        traceId,
        state: WorkflowState.FAILED,
        error: `工作流校验失败: ${errorMessages}`,
        summary: recorder.summarize(WorkflowState.FAILED),
        events: recorder.getEvents(),
      };
      return this.stubInstance(instanceId, traceId, recorder, failedResult);
    }

    // ---- 运行态初始化 ----
    const stateMachine = new WorkflowStateMachine(WorkflowState.VALIDATED);
    const ctx = new WorkflowContext({
      input: options.input ?? {},
      variables: wf.variables ?? {},
      patient: options.patient,
      user: options.user,
      trigger: {
        type: options.trigger?.type ?? 'manual',
        source: options.trigger?.source,
        userId: options.trigger?.userId,
        traceId,
      },
      instanceId,
    });

    const abortController = new AbortController();
    let pauseGate: { promise: Promise<void>; release: () => void } | null = null;

    const runtime: WorkflowRuntime = {
      ...this.baseRuntime,
      ...options.runtimeOverride,
      sleep: options.runtimeOverride?.sleep ?? this.baseRuntime.sleep ?? defaultSleep,
      onEvent: (event: unknown) => {
        const e = event as { type?: string };
        try {
          if (e?.type === 'human_waiting' && stateMachine.state === WorkflowState.RUNNING) {
            stateMachine.transition(WorkflowState.WAITING_HUMAN);
          } else if (e?.type === 'human_resolved' && stateMachine.state === WorkflowState.WAITING_HUMAN) {
            stateMachine.transition(WorkflowState.RUNNING);
          }
        } catch {
          /* 以主流程状态为准 */
        }
        this.baseRuntime.onEvent?.(event);
      },
    };

    const nodeMap = new Map<string, NodeDefinition>(wf.nodes.map((n) => [n.id, n]));
    const outgoing = new Map<string, EdgeDefinition[]>();
    for (const n of wf.nodes) outgoing.set(n.id, []);
    for (const edge of wf.edges) {
      outgoing.get(edge.source)?.push(edge);
    }
    const startNode = wf.nodes.find((n) => n.type === WorkflowNodeType.START)!;

    const gateIfPaused = async (): Promise<void> => {
      if (pauseGate) {
        recorder.record(ExecutionEventType.WORKFLOW_PAUSED);
        await pauseGate.promise;
      }
    };

    const ncBase: Omit<NodeExecutorContext, 'signal'> = {
      ctx,
      runtime,
      runner: undefined as unknown as PathRunner, // 下方填充
      instanceId,
      createHumanTaskId: () => genId('human'),
    };

    const deps: PathDeps = {
      nodeMap,
      outgoing,
      ctx,
      runtime,
      recorder,
      abortController,
      stateMachine,
      ncBase,
      gateIfPaused,
    };

    const runner: PathRunner = {
      runPath: (entryNodeId: string) => this.runPath(entryNodeId, deps),
    };
    ncBase.runner = runner;

    // ---- 主执行 ----
    const resultPromise = (async (): Promise<WorkflowRunResult> => {
      try {
        stateMachine.transition(WorkflowState.RUNNING);
        recorder.record(ExecutionEventType.WORKFLOW_STARTED, {
          workflowId: wf.meta.id,
          version: wf.meta.version,
        });

        const runMain = this.runPath(startNode.id, deps);
        const workflowTimeout = options.timeoutMs ?? wf.timeoutMs;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const finalPath = await (workflowTimeout
          ? Promise.race([
              runMain,
              new Promise<never>((_, reject) => {
                timer = setTimeout(
                  () => reject(new Error(`工作流整体超时(${workflowTimeout}ms)`)),
                  workflowTimeout,
                );
              }),
            ]).finally(() => timer && clearTimeout(timer))
          : runMain);

        stateMachine.transition(WorkflowState.COMPLETED);
        recorder.record(ExecutionEventType.WORKFLOW_COMPLETED, { output: finalPath.output });
        return {
          success: true,
          instanceId,
          traceId,
          state: WorkflowState.COMPLETED,
          output: finalPath.output,
          summary: recorder.summarize(WorkflowState.COMPLETED),
          events: recorder.getEvents(),
        };
      } catch (err) {
        const cancelled = err instanceof WorkflowCancelledError || abortController.signal.aborted;
        const state = cancelled ? WorkflowState.CANCELLED : WorkflowState.FAILED;
        try {
          stateMachine.transition(state);
        } catch (e) {
          if (!(e instanceof IllegalStateTransitionError)) throw e;
        }
        recorder.record(
          cancelled ? ExecutionEventType.WORKFLOW_CANCELLED : ExecutionEventType.WORKFLOW_FAILED,
          { reason: err instanceof Error ? err.message : String(err) },
        );
        return {
          success: false,
          instanceId,
          traceId,
          state,
          error: err instanceof Error ? err.message : String(err),
          summary: recorder.summarize(state),
          events: recorder.getEvents(),
        };
      }
    })();

    return {
      instanceId,
      traceId,
      result: resultPromise,
      getState: () => stateMachine.state,
      recorder,
      context: ctx,
      pause(): void {
        if (stateMachine.state === WorkflowState.RUNNING) {
          stateMachine.transition(WorkflowState.PAUSED);
          let release: () => void = () => {};
          const promise = new Promise<void>((r) => {
            release = r;
          });
          pauseGate = { promise, release };
        }
      },
      resume(): void {
        if (stateMachine.state === WorkflowState.PAUSED) {
          stateMachine.transition(WorkflowState.RUNNING);
          const gate = pauseGate;
          pauseGate = null;
          gate?.release();
        }
      },
      cancel(reason?: string): void {
        if (stateMachine.isTerminal) return;
        abortController.abort(reason ?? 'cancelled');
        const gate = pauseGate;
        pauseGate = null;
        gate?.release();
      },
    };
  }

  private stubInstance(
    instanceId: string,
    traceId: string,
    recorder: ExecutionRecorder,
    result: WorkflowRunResult,
  ): WorkflowInstance {
    const ctx = new WorkflowContext({ trigger: { type: 'manual', traceId }, instanceId });
    return {
      instanceId,
      traceId,
      result: Promise.resolve(result),
      getState: () => WorkflowState.FAILED,
      pause() {},
      resume() {},
      cancel() {},
      recorder,
      context: ctx,
    };
  }

  // ==========================================================================
  // 路径执行（核心解释循环）
  // ==========================================================================

  /**
   * 从入口节点沿出边执行一条路径，直到 end 或无出边。
   * 主流程与 loop/parallel 递归复用同一逻辑。
   */
  private async runPath(entryNodeId: string, d: PathDeps): Promise<PathRunResult> {
    let currentId: string | undefined = entryNodeId;
    let lastOutput: unknown;

    while (currentId) {
      await d.gateIfPaused();
      if (d.abortController.signal.aborted) throw new WorkflowCancelledError();

      const node = d.nodeMap.get(currentId);
      if (!node) return { terminalNodeId: currentId, output: lastOutput };

      const outcome = await this.executeNode(node, d);
      if (outcome.fallbackNodeId) {
        currentId = outcome.fallbackNodeId;
        continue;
      }
      lastOutput = outcome.output;

      if (node.type === WorkflowNodeType.END) {
        return { terminalNodeId: node.id, output: outcome.output };
      }

      const edges = d.outgoing.get(node.id) ?? [];
      const edge = this.selectEdge(node, edges, outcome.selectedPort ?? 'out');
      if (!edge) {
        // 子路径/分支终点：无出边即结束
        return { terminalNodeId: node.id, output: outcome.output };
      }

      if (edge.dataMapping && Object.keys(edge.dataMapping).length > 0) {
        d.ctx.mergeVariables(d.ctx.applyMapping(edge.dataMapping));
      }
      currentId = edge.target;
    }

    return { terminalNodeId: entryNodeId, output: lastOutput };
  }

  /** 选择出边：条件节点按端口，其余取唯一 out 边 */
  private selectEdge(node: NodeDefinition, edges: EdgeDefinition[], port: string): EdgeDefinition | undefined {
    if (node.type === WorkflowNodeType.CONDITION) {
      return edges.find((e) => (e.sourcePort ?? 'out') === port);
    }
    return edges.find((e) => !e.sourcePort || e.sourcePort === 'out') ?? edges[0];
  }

  /** 执行单个节点，含超时、重试、降级 */
  private async executeNode(node: NodeDefinition, d: PathDeps): Promise<InternalOutcome> {
    const executor = this.executors.get(node.type);
    if (!executor) {
      return { status: 'failed', error: `不支持的节点类型: ${node.type}` };
    }

    const policy = node.errorHandling?.retry;
    const maxAttempts = policy ? policy.maxAttempts + 1 : 1;
    const nc: NodeExecutorContext = { ...d.ncBase, signal: d.abortController.signal };

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++;
      d.ctx.markNodeStarted(node.id);
      d.recorder.record(ExecutionEventType.NODE_STARTED, { attempt, type: node.type }, node.id);

      let outcome: NodeOutcome;
      try {
        outcome = await this.withTimeout(node.timeoutMs, () => executor.execute(node, nc));
      } catch (e) {
        if (e instanceof WorkflowCancelledError || d.abortController.signal.aborted) {
          throw new WorkflowCancelledError();
        }
        outcome = { status: 'failed', error: e instanceof Error ? e.message : String(e) };
      }

      if (outcome.status === 'completed') {
        d.ctx.markNodeCompleted(node.id, outcome.output, outcome.tokens);
        d.recorder.record(
          ExecutionEventType.NODE_COMPLETED,
          { output: this.summarize(outcome.output), tokens: outcome.tokens },
          node.id,
        );
        return outcome;
      }

      if (outcome.status === 'cancelled' || d.abortController.signal.aborted) {
        throw new WorkflowCancelledError();
      }

      d.ctx.markNodeFailed(node.id, outcome.error ?? '未知错误');
      d.recorder.record(ExecutionEventType.NODE_FAILED, { error: outcome.error, attempt }, node.id);

      const canRetry = attempt < maxAttempts && this.isRetryable(outcome.error, policy);
      if (canRetry) {
        const delay = this.backoffDelay(attempt, policy!);
        d.recorder.record(ExecutionEventType.NODE_RETRYING, { attempt, nextDelayMs: delay }, node.id);
        await (d.runtime.sleep ?? defaultSleep)(delay);
        if (d.abortController.signal.aborted) throw new WorkflowCancelledError();
        continue;
      }

      if (node.errorHandling?.fallbackNode) {
        d.recorder.record(
          ExecutionEventType.NODE_SKIPPED,
          { fallback: node.errorHandling.fallbackNode },
          node.id,
        );
        return { ...outcome, status: 'completed', fallbackNodeId: node.errorHandling.fallbackNode };
      }

      throw new WorkflowExecutionError(node.id, outcome.error ?? '未知错误');
    }
  }

  private async withTimeout<T>(timeoutMs: number | undefined, fn: () => Promise<T>): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) return fn();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`节点执行超时(${timeoutMs}ms)`)), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private isRetryable(error: string | undefined, policy: RetryPolicy | undefined): boolean {
    if (!policy || policy.maxAttempts <= 0) return false;
    if (!error) return false;
    if (policy.retryableErrorCodes && policy.retryableErrorCodes.length > 0) {
      return policy.retryableErrorCodes.some((code) => error.includes(code));
    }
    return /超时|timeout|TIMEOUT|网络|network|ECONN|503|502|429|临时|temporary/i.test(error);
  }

  private backoffDelay(attempt: number, policy: RetryPolicy): number {
    const base = policy.initialDelayMs ?? 200;
    const mult = policy.backoffMultiplier ?? 2;
    const max = policy.maxDelayMs ?? 5000;
    return Math.min(max, base * mult ** (attempt - 1));
  }

  private summarize(output: unknown): unknown {
    if (output === null || output === undefined) return output;
    try {
      const json = JSON.stringify(output);
      if (json.length <= 500) return output;
      return { _truncated: true, preview: json.slice(0, 500) };
    } catch {
      return '[unserializable]';
    }
  }
}
