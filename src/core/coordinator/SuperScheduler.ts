/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 超级调度智能体（SuperScheduler / AG-18）
 * 流程：意图识别 → 能力匹配 → 负载均衡 → 任务分发 → 结果聚合。
 * 支持 simple / chain / parallel / event 四种路由策略。
 * 对应设计文档：02-Agent能力与医疗工具设计 §1.8 超级调度智能体路由策略。
 */

import type { AgentRequest, AgentResponse } from '@/types/agent';

import { type AgentRegistry } from './AgentRegistry';
import { type AgentExecutor, type CollaborationEngine } from './CollaborationEngine';
import { type IntentClassifier, type IntentScore } from './IntentClassifier';
import type {
  AggregatedResponse,
  AggregationStrategy,
  CapabilityTag,
  RoutePlan,
  RouteStrategy,
} from './types';

/** 意图 → 能力标签映射 */
const INTENT_TO_CAPABILITY: Readonly<Record<string, CapabilityTag>> = {
  问诊: 'triage',
  病历书写: 'record_writing',
  病历查询: 'record_query',
  医嘱开具: 'order_writing',
  医嘱查询: 'order_query',
  检验开具: 'lab_writing',
  检验查询: 'lab_interpretation',
  影像查询: 'imaging_interpretation',
  诊断建议: 'diagnosis',
  治疗方案: 'treatment_plan',
  用药咨询: 'medication_consult',
  质控检查: 'quality_control',
  教学培训: 'teaching',
  科研分析: 'research',
  运营管理: 'operation_management',
  系统设置: 'system_config',
};

/** 意图 → 默认路由策略映射 */
const INTENT_TO_STRATEGY: Readonly<Record<string, RouteStrategy>> = {
  问诊: 'parallel', // 问诊引导 + ADS 并行
  诊断建议: 'parallel', // 诊断 + 检验解读并行
  检验查询: 'simple',
  影像查询: 'simple',
  病历书写: 'chain', // 生成 → 质控链式
  治疗方案: 'simple',
  用药咨询: 'simple',
  质控检查: 'simple',
  教学培训: 'simple',
  科研分析: 'simple',
  运营管理: 'simple',
  系统设置: 'simple',
  医嘱开具: 'simple',
  医嘱查询: 'simple',
  检验开具: 'simple',
  病历查询: 'simple',
};

/** 事件订阅表：事件类型 -> 触发的 Agent 名称列表 */
type EventSubscriptions = Map<string, string[]>;

/**
 * 超级调度智能体
 *
 * 系统的中央路由器，协调所有已注册 Agent。
 * 不直接执行业务逻辑，只负责"决策 + 分发 + 聚合"。
 */
export class SuperScheduler {
  /** 事件订阅表 */
  private readonly subscriptions: EventSubscriptions = new Map();

  /**
   * @param registry - Agent 注册中心
   * @param classifier - 意图分类器
   * @param engine - 协作引擎
   */
  constructor(
    private readonly registry: AgentRegistry,
    private readonly classifier: IntentClassifier,
    private readonly engine: CollaborationEngine,
  ) {}

  // ----------------------------------------------------------
  // 核心调度流程
  // ----------------------------------------------------------

  /**
   * 处理一次用户请求：识别 → 路由 → 执行 → 聚合
   *
   * @param request - 标准化 Agent 请求
   * @returns 聚合后的统一响应
   */
  async dispatch(request: AgentRequest): Promise<AggregatedResponse> {
    const startedAt = Date.now();

    // 第1层：意图识别
    const intents = this.classifier.classify(request.userInput);
    const primary = intents[0];

    // 第2层：构造路由计划
    const plan = this.buildRoutePlan(request, primary, intents);

    // 第3层：按策略分发
    const executor = this.buildExecutor();
    let result: AggregatedResponse;
    switch (plan.strategy) {
      case 'chain':
        result = await this.engine.runChain(plan.agentNames, request, executor, plan.aggregation);
        break;
      case 'parallel':
        result = await this.engine.runParallel(
          plan.agentNames,
          request,
          executor,
          plan.aggregation,
        );
        break;
      case 'event':
        result = await this.handleEventRoute(plan, request, executor);
        break;
      case 'simple':
      default:
        result = await this.engine.runParallel(
          plan.agentNames,
          request,
          executor,
          plan.aggregation,
        );
        break;
    }

    void startedAt;
    return result;
  }

  /**
   * 仅做路由决策（不执行），用于审计与调试
   *
   * @param request - 标准化请求
   */
  plan(request: AgentRequest): RoutePlan {
    const intents = this.classifier.classify(request.userInput);
    return this.buildRoutePlan(request, intents[0], intents);
  }

  // ----------------------------------------------------------
  // 事件触发路由
  // ----------------------------------------------------------

  /**
   * 订阅事件：事件触发时自动激活指定 Agent
   *
   * @param eventType - 事件类型（如 'critical_value'、'qc_issue'）
   * @param agentNames - 被触发的 Agent 名称列表
   */
  subscribe(eventType: string, ...agentNames: string[]): void {
    const list = this.subscriptions.get(eventType) ?? [];
    this.subscriptions.set(eventType, [...new Set([...list, ...agentNames])]);
  }

  /**
   * 触发事件：调用所有订阅该事件的 Agent
   *
   * @param eventType - 事件类型
   * @param request - 携带事件数据的请求
   */
  async emit(eventType: string, request: AgentRequest): Promise<AggregatedResponse> {
    const targets = this.subscriptions.get(eventType) ?? [];
    const executor = this.buildExecutor();
    return this.engine.runParallel(targets, request, executor, 'merge_dedup');
  }

  // ----------------------------------------------------------
  // 内部方法
  // ----------------------------------------------------------

  /**
   * 根据意图构造路由计划
   */
  private buildRoutePlan(
    request: AgentRequest,
    primary: IntentScore | undefined,
    allIntents: IntentScore[],
  ): RoutePlan {
    const startedAt = Date.now();
    const intentName = primary?.primaryIntent ?? '问诊';
    const capability = INTENT_TO_CAPABILITY[intentName] ?? 'triage';
    const strategy: RouteStrategy = INTENT_TO_STRATEGY[intentName] ?? 'simple';

    // 能力匹配：收集主意图 + 次意图对应的候选 Agent
    const capabilities: CapabilityTag[] = [capability];
    for (const extra of allIntents.slice(1)) {
      const cap = INTENT_TO_CAPABILITY[extra.primaryIntent];
      if (cap) capabilities.push(cap);
    }

    const candidates = this.registry.findByCapability(...capabilities).map((a) => a.metadata.name);

    // 去重保序
    const agentNames = [...new Set(candidates)];

    // 无候选时回退到主 Agent
    if (agentNames.length === 0) {
      agentNames.push('main');
    }

    const aggregation: AggregationStrategy =
      strategy === 'parallel' ? 'merge_dedup' : 'merge_dedup';

    return {
      planId: `plan_${startedAt}_${Math.random().toString(36).slice(2, 8)}`,
      primaryIntent: intentName,
      strategy,
      agentNames,
      aggregation,
      reason: `意图"${intentName}" → 能力"${capability}" → 策略"${strategy}"`,
      timeoutMs: request.timeoutMs ?? 120_000,
      confidence: primary?.confidence ?? 0.3,
    };
  }

  /**
   * 构造统一的 Agent 执行器（含负载 acquire/release 与耗时统计）
   */
  private buildExecutor(): AgentExecutor {
    return async (agentName: string, request: AgentRequest): Promise<AgentResponse> => {
      const agent = this.registry.pickLeastLoaded([agentName]);
      if (!agent) {
        return this.fallbackResponse(
          agentName,
          request,
          'AGENT_UNAVAILABLE',
          `Agent 不可用: ${agentName}`,
        );
      }

      const startedAt = Date.now();
      try {
        this.registry.acquire(agent.metadata.name);
      } catch {
        // 并发已满：以降级方式返回，不阻塞调度
        return this.fallbackResponse(
          agent.metadata.name,
          request,
          'AGENT_BUSY',
          `Agent 繁忙: ${agent.metadata.name}`,
        );
      }

      try {
        const res = await agent.execute(request);
        this.registry.release(agent.metadata.name, Date.now() - startedAt, res.success);
        return res;
      } catch (err) {
        this.registry.release(agent.metadata.name, Date.now() - startedAt, false);
        return this.fallbackResponse(
          agent.metadata.name,
          request,
          'AGENT_EXECUTION_ERROR',
          err instanceof Error ? err.message : String(err),
        );
      }
    };
  }

  /**
   * 事件触发路由：按 plan.agentNames 并行执行
   */
  private async handleEventRoute(
    plan: RoutePlan,
    request: AgentRequest,
    executor: AgentExecutor,
  ): Promise<AggregatedResponse> {
    return this.engine.runParallel(plan.agentNames, request, executor, plan.aggregation);
  }

  /** 构造失败/降级响应 */
  private fallbackResponse(
    agentId: string,
    request: AgentRequest,
    code: string,
    message: string,
  ): AgentResponse {
    return {
      responseId: `resp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      requestId: request.requestId,
      sessionId: request.sessionId,
      agentId,
      success: false,
      output: '',
      toolCalls: [],
      toolResults: [],
      confidence: 0,
      durationMs: 0,
      tokens: 0,
      error: { code, message },
      timestamp: Date.now(),
    };
  }
}
