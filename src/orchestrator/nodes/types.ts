/**
 * 健澜科技杠OS - 节点执行器契约
 *
 * 每一类工作流节点对应一个 NodeExecutor，负责：
 *   1. 从 WorkflowContext 解析输入（表达式/映射）；
 *   2. 调用相应运行时服务（LLM/工具/RAG/人工/子智能体）；
 *   3. 产出结构化输出写回上下文，并告知引擎下一走哪个出口端口。
 *
 * loop / parallel 等结构化节点通过 PathRunner 递归驱动子路径，
 * 从而以"递归下降解释器"的方式支持嵌套，而无需在图中画回边（避免环）。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { WorkflowNodeType, NodeDefinition } from '../dsl/types.js';
import type { WorkflowContext } from '../engine/context.js';
import type { WorkflowRuntime, PendingHumanTask } from '../engine/runtime.js';

/** 子路径执行结果 */
export interface PathRunResult {
  /** 路径终止节点 ID */
  terminalNodeId: string;
  /** 终止节点输出 */
  output: unknown;
  /** 若路径在人工节点挂起，则携带挂起任务 */
  suspended?: PendingHumanTask;
  /** 路径是否被取消 */
  cancelled?: boolean;
}

/** 子路径执行器（由 WorkflowEngine 实现，供 loop/parallel 递归调用） */
export interface PathRunner {
  /**
   * 从指定入口节点开始，沿出边执行一条路径，直到无出边/end。
   * 路径内部支持 condition 分支；遇人工节点则挂起并返回 suspended。
   */
  runPath(entryNodeId: string, branchName?: string): Promise<PathRunResult>;
}

/** 节点执行上下文 */
export interface NodeExecutorContext {
  /** 工作流运行时上下文 */
  ctx: WorkflowContext;
  /** 运行时服务 */
  runtime: WorkflowRuntime;
  /** 子路径执行器 */
  runner: PathRunner;
  /** 工作流实例 ID */
  instanceId: string;
  /** 取消信号 */
  signal: AbortSignal;
  /** 生成人工任务 ID */
  createHumanTaskId(): string;
}

/** 节点执行结果状态 */
export type NodeOutcomeStatus = 'completed' | 'waiting_human' | 'cancelled' | 'failed';

/** 节点执行结果 */
export interface NodeOutcome {
  status: NodeOutcomeStatus;
  /** 节点结构化输出 */
  output?: unknown;
  /** 选择的出边端口（condition 节点）；普通节点为 'out' */
  selectedPort?: string;
  /** 挂起的人工任务 */
  humanTask?: PendingHumanTask;
  /** LLM token 用量 */
  tokens?: { input: number; output: number };
  /** 失败原因 */
  error?: string;
}

/** 节点执行器接口 */
export interface NodeExecutor {
  /** 所处理的节点类型 */
  readonly type: WorkflowNodeType;
  execute(node: NodeDefinition, nc: NodeExecutorContext): Promise<NodeOutcome>;
}

/** 工作流被取消错误 */
export class WorkflowCancelledError extends Error {
  constructor() {
    super('工作流已被取消');
    this.name = 'WorkflowCancelledError';
  }
}

/** 若已发出取消信号则抛错 */
export function assertNotCancelled(signal: AbortSignal): void {
  if (signal.aborted) throw new WorkflowCancelledError();
}
