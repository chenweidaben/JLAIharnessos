/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 协作引擎（CollaborationEngine）
 * 实现顺序链式、并行协同、会诊（多学科）、主从四种协作模式，
 * 并提供 vote / weighted / experts_first / merge_dedup 四种结果聚合策略。
 * 对应设计文档：02-Agent能力与医疗工具设计 §1.7 智能体间协作、§1.8.3 结果聚合策略。
 */

import type { AgentRequest, AgentResponse } from '@/types/agent';

import type { AggregatedResponse, AggregationStrategy } from './types';

/**
 * Agent 执行函数类型
 *
 * 由 SuperScheduler 注入，封装"查找 Agent → acquire → execute → release"流程。
 * 协作引擎仅依赖该抽象，不直接持有 Registry，便于测试与替换。
 */
export type AgentExecutor = (agentName: string, request: AgentRequest) => Promise<AgentResponse>;

/**
 * 结果聚合选项
 */
export interface AggregateOptions {
  /** 聚合策略 */
  readonly strategy: AggregationStrategy;
  /** 会话ID */
  readonly sessionId: string;
  /** 总耗时（毫秒） */
  readonly durationMs: number;
}

/**
 * 协作引擎
 *
 * 无状态服务对象，可在调度器与子代理管理器间共享。
 * 所有方法均为异步，通过 Promise 模拟并发，不依赖真实多线程。
 */
export class CollaborationEngine {
  /**
   * 顺序链式协作：Agent A 输出 → Agent B 输入 → ... → 最终结果
   *
   * 前一个 Agent 的 output 会作为后一个 Agent request 的 userInput 追加，
   * 形成流水线；任一环节失败则短路返回已累积的部分结果。
   *
   * @param agentNames - 按执行顺序排列的 Agent 名称列表
   * @param request - 原始请求
   * @param executor - Agent 执行器
   * @param strategy - 聚合策略（链式默认 merge_dedup）
   */
  async runChain(
    agentNames: readonly string[],
    request: AgentRequest,
    executor: AgentExecutor,
    strategy: AggregationStrategy = 'merge_dedup',
  ): Promise<AggregatedResponse> {
    const startedAt = Date.now();
    const partials: AgentResponse[] = [];
    let currentInput = request.userInput;

    for (const name of agentNames) {
      const chained: AgentRequest = {
        ...request,
        requestId: `${request.requestId}->${name}`,
        userInput: currentInput,
      };
      const res = await executor(name, chained);
      partials.push(res);
      if (!res.success) break;
      currentInput = `${currentInput}\n\n[上游Agent ${res.agentId} 输出]：\n${res.output}`;
    }

    return this.aggregate(partials, {
      strategy,
      sessionId: request.sessionId,
      durationMs: Date.now() - startedAt,
    });
  }

  /**
   * 并行协同：多个 Agent 同时处理同一请求，结果聚合
   *
   * @param agentNames - 并行 Agent 名称列表
   * @param request - 原始请求
   * @param executor - Agent 执行器
   * @param strategy - 聚合策略
   */
  async runParallel(
    agentNames: readonly string[],
    request: AgentRequest,
    executor: AgentExecutor,
    strategy: AggregationStrategy = 'merge_dedup',
  ): Promise<AggregatedResponse> {
    const startedAt = Date.now();
    const partials = await Promise.all(agentNames.map((name) => executor(name, request)));
    return this.aggregate(partials, {
      strategy,
      sessionId: request.sessionId,
      durationMs: Date.now() - startedAt,
    });
  }

  /**
   * 主从模式：主 Agent 协调，子 Agent 并行执行具体任务
   *
   * 子 Agent 先并行执行，其结果作为上下文交由主 Agent 汇总成最终输出。
   *
   * @param masterName - 主 Agent 名称
   * @param slaveNames - 从 Agent 名称列表
   * @param request - 原始请求
   * @param executor - Agent 执行器
   */
  async runMasterSlave(
    masterName: string,
    slaveNames: readonly string[],
    request: AgentRequest,
    executor: AgentExecutor,
  ): Promise<AggregatedResponse> {
    const startedAt = Date.now();
    const slavePartials = await Promise.all(slaveNames.map((name) => executor(name, request)));

    const slaveDigest = slavePartials
      .map((p) => `【${p.agentId}】(置信度${(p.confidence * 100).toFixed(0)}%)\n${p.output}`)
      .join('\n\n---\n\n');

    const masterRequest: AgentRequest = {
      ...request,
      requestId: `${request.requestId}->master`,
      userInput: `${request.userInput}\n\n[各专科子代理分析结果，请综合并去重]：\n${slaveDigest}`,
    };
    const masterPartial = await executor(masterName, masterRequest);

    return this.aggregate([...slavePartials, masterPartial], {
      strategy: 'experts_first',
      sessionId: request.sessionId,
      durationMs: Date.now() - startedAt,
    });
  }

  /**
   * 结果聚合（纯函数）
   *
   * @param partials - 各 Agent 的响应列表
   * @param options - 聚合选项
   */
  aggregate(partials: readonly AgentResponse[], options: AggregateOptions): AggregatedResponse {
    const ok = partials.filter((p) => p.success);
    const hasConflict = this.detectConflict(partials);

    let output: string;
    switch (options.strategy) {
      case 'vote':
        output = this.aggregateVote(ok);
        break;
      case 'weighted':
        output = this.aggregateWeighted(ok);
        break;
      case 'experts_first':
        output = this.aggregateExpertsFirst(partials);
        break;
      case 'merge_dedup':
      default:
        output = this.aggregateMergeDedup(ok);
        break;
    }

    if (hasConflict) {
      output = `⚠️ 各智能体结论存在差异，已并陈供医生裁决：\n\n${output}`;
    }

    return {
      responseId: `agg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId: options.sessionId,
      output,
      partials,
      hasConflict,
      aggregation: options.strategy,
      durationMs: options.durationMs,
      timestamp: Date.now(),
    };
  }

  // ----------------------------------------------------------
  // 聚合策略实现
  // ----------------------------------------------------------

  /** 投票：成功结果均按来源罗列，多数派意见前置 */
  private aggregateVote(partials: readonly AgentResponse[]): string {
    if (partials.length === 0) return '（无可用结果）';
    return partials.map((p, i) => `${i + 1}. 【${p.agentId}】\n${p.output}`).join('\n\n');
  }

  /** 加权：取 confidence 最高者为结论，其余作为补充 */
  private aggregateWeighted(partials: readonly AgentResponse[]): string {
    if (partials.length === 0) return '（无可用结果）';
    const sorted = [...partials].sort((a, b) => b.confidence - a.confidence);
    const [best, ...rest] = sorted;
    let text = `【主结论 · ${best.agentId}】\n${best.output}`;
    if (rest.length > 0) {
      text += '\n\n【补充意见】\n' + rest.map((r) => `· ${r.agentId}：${r.output}`).join('\n');
    }
    return text;
  }

  /** 专家优先：按 Agent 名称暗示的专科优先级（会诊场景），最后一个通常为主汇总 */
  private aggregateExpertsFirst(partials: readonly AgentResponse[]): string {
    if (partials.length === 0) return '（无可用结果）';
    const master = partials[partials.length - 1];
    const experts = partials.slice(0, -1);
    let text = experts.map((p) => `【${p.agentId}】\n${p.output}`).join('\n\n');
    if (master) {
      text += `\n\n【综合意见 · ${master.agentId}】\n${master.output}`;
    }
    return text;
  }

  /** 合并去重：按行合并，去除重复输出块 */
  private aggregateMergeDedup(partials: readonly AgentResponse[]): string {
    const seen = new Set<string>();
    const blocks: string[] = [];
    for (const p of partials) {
      if (!p.success || !p.output) continue;
      const normalized = p.output.trim();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      blocks.push(`【${p.agentId}】\n${p.output}`);
    }
    return blocks.length > 0 ? blocks.join('\n\n') : '（无可用结果）';
  }

  /**
   * 简易冲突检测：当成功结果的"主结论句"不一致时标记冲突
   *
   * 当前实现基于首行文本相似度（完全不同即视为冲突）。
   *
   * @param partials - 各 Agent 响应
   */
  private detectConflict(partials: readonly AgentResponse[]): boolean {
    const firstLines = partials
      .filter((p) => p.success && p.output)
      .map((p) => p.output.split('\n')[0].trim())
      .filter(Boolean);
    const unique = new Set(firstLines);
    return unique.size > 1;
  }
}
