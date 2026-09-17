/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 超级调度层（Coordinator）共享类型定义。
 * 对应设计文档：02-Agent能力与医疗工具设计 §1.7 协作模式、§1.8 路由策略。
 */

import type { AgentRequest, AgentResponse, RequestPriority } from '@/types/agent';

// ============================================================
// 智能体分层与能力
// ============================================================

/** 智能体分层（四层二十智能体体系） */
export type AgentLayer =
  | 'L1' // 诊疗智能体
  | 'L2' // 管理智能体
  | 'L3' // 赋能智能体
  | 'L4'; // 平台智能体

/**
 * 能力标签
 *
 * 用于意图到 Agent 的能力匹配。
 */
export type CapabilityTag =
  | 'triage' // 问诊引导
  | 'record_writing' // 病历书写
  | 'record_query' // 病历查询
  | 'order_writing' // 医嘱开具
  | 'order_query' // 医嘱查询
  | 'lab_writing' // 检验开具
  | 'lab_interpretation' // 检验解读
  | 'imaging_interpretation' // 影像解读
  | 'diagnosis' // 诊断建议
  | 'treatment_plan' // 治疗方案
  | 'medication_consult' // 用药咨询
  | 'quality_control' // 质控检查
  | 'teaching' // 教学培训
  | 'research' // 科研分析
  | 'operation_management' // 运营管理
  | 'system_config'; // 系统设置

/**
 * 可执行智能体接口
 *
 * 所有接入超级调度器的 Agent 必须实现该接口。
 * 基于 claude-code QueryEngine 会话循环抽象，便于 Mock 与替换。
 */
export interface ExecutableAgent {
  /** 智能体元数据（不可变） */
  readonly metadata: AgentMetadata;

  /**
   * 执行一次 Agent 请求
   *
   * @param request - 标准化 Agent 请求
   * @returns 标准化 Agent 响应
   */
  execute(request: AgentRequest): Promise<AgentResponse>;
}

/**
 * 智能体元数据
 *
 * 描述一个 Agent 的身份、能力、工具与运行约束，
 * 供 AgentRegistry 注册与 SuperScheduler 路由匹配使用。
 */
export interface AgentMetadata {
  /** 唯一标识（如 'ag01_ads'、'internal-medicine'） */
  readonly name: string;
  /** 中文显示名称 */
  readonly displayName: string;
  /** 能力描述（供调度器理解适用场景） */
  readonly description: string;
  /** 所属层级 */
  readonly layer: AgentLayer;
  /** 能力标签集合（用于能力匹配） */
  readonly capabilities: readonly CapabilityTag[];
  /** 可调用的医疗工具名称白名单 */
  readonly tools: readonly string[];
  /** 优先级（数值越大越优先，默认 0） */
  readonly priority: number;
  /** 推荐使用的模型标识（如 'sonnet' / 'haiku' / 'inherit'） */
  readonly model: string;
  /** 单实例最大并发任务数 */
  readonly maxConcurrency: number;
  /** 默认超时（毫秒） */
  readonly timeoutMs: number;
  /** 是否健康（可被调度） */
  healthy: boolean;
}

// ============================================================
// 路由与协作
// ============================================================

/** 路由策略 */
export type RouteStrategy =
  | 'simple' // 简单路由：单 Agent 处理
  | 'chain' // 顺序链式：A→B→C
  | 'parallel' // 并行协同：多 Agent 同时处理
  | 'event'; // 事件触发：基于事件自动激活

/** 结果聚合策略 */
export type AggregationStrategy =
  | 'vote' // 投票：多数意见为准
  | 'weighted' // 加权：按 Agent 优先级/置信度加权
  | 'experts_first' // 专家优先：专科 Agent 结论优先呈现
  | 'merge_dedup'; // 合并去重：文本拼接并去除重复观点

/**
 * 路由计划
 *
 * SuperScheduler 根据意图与能力匹配生成的执行计划。
 */
export interface RoutePlan {
  /** 计划唯一ID */
  readonly planId: string;
  /** 命中的主意图 */
  readonly primaryIntent: string;
  /** 路由策略 */
  readonly strategy: RouteStrategy;
  /** 参与执行的 Agent 名称列表（按执行顺序） */
  readonly agentNames: readonly string[];
  /** 聚合策略 */
  readonly aggregation: AggregationStrategy;
  /** 路由原因 */
  readonly reason: string;
  /** 整体超时（毫秒） */
  readonly timeoutMs: number;
  /** 决策置信度（0-1） */
  readonly confidence: number;
}

/**
 * 聚合后的统一响应
 *
 * 当多个 Agent 参与执行时，调度器返回该结构，
 * 保留各子结果溯源信息，满足医疗审计要求。
 */
export interface AggregatedResponse {
  /** 聚合响应ID */
  readonly responseId: string;
  /** 关联会话ID */
  readonly sessionId: string;
  /** 最终输出文本 */
  readonly output: string;
  /** 各 Agent 的原始响应（溯源保留） */
  readonly partials: readonly AgentResponse[];
  /** 是否存在观点冲突 */
  readonly hasConflict: boolean;
  /** 使用的聚合策略 */
  readonly aggregation: AggregationStrategy;
  /** 总耗时（毫秒） */
  readonly durationMs: number;
  /** 时间戳 */
  readonly timestamp: number;
}

/**
 * 智能体运行时负载快照
 *
 * 供负载均衡策略决策使用。
 */
export interface AgentLoad {
  /** Agent 名称 */
  readonly name: string;
  /** 当前并发运行任务数 */
  readonly activeTasks: number;
  /** 队列等待任务数 */
  readonly queuedTasks: number;
  /** 最近一次执行耗时（毫秒），无则为 null */
  readonly lastDurationMs: number | null;
  /** 最近失败次数（滑动窗口） */
  readonly recentFailures: number;
}

/** 任务优先级（与 RequestPriority 对齐，数值越大越紧急） */
export const PRIORITY_WEIGHT: Readonly<Record<RequestPriority, number>> = {
  stat: 3,
  urgent: 2,
  routine: 1,
} as const;
