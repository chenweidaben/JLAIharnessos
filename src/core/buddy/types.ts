/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 子代理（Buddy）系统共享类型定义。
 * 对应设计文档：02-Agent能力与医疗工具设计 §5 子代理（科室代理）设计。
 */

// ============================================================
// LLM 客户端抽象（子代理不直接依赖真实 LLM）
// ============================================================

/** LLM 请求参数 */
export interface LLMRequest {
  /** 系统提示词（含科室专业提示词） */
  readonly systemPrompt: string;
  /** 用户/任务消息 */
  readonly userMessage: string;
  /** 指定模型（如 'sonnet' / 'haiku'） */
  readonly model?: string;
  /** 推理力度 */
  readonly effort?: 'low' | 'medium' | 'high';
  /** 允许调用的工具名称白名单 */
  readonly allowedTools: readonly string[];
  /** 最大轮次 */
  readonly maxTurns: number;
  /** 关联患者ID（用于审计与转录） */
  readonly patientId?: string;
}

/** LLM 响应 */
export interface LLMResponse {
  /** 最终输出文本（摘要） */
  readonly output: string;
  /** 实际使用的模型 */
  readonly model: string;
  /** 执行轮次 */
  readonly turns: number;
  /** 调用的工具名称列表 */
  readonly toolCalls: readonly string[];
  /** 置信度（0-1） */
  readonly confidence: number;
  /** Token 用量 */
  readonly tokens: number;
  /** 是否超时截断 */
  readonly truncated: boolean;
}

/**
 * LLM 客户端接口
 *
 * 生产实现对接真实推理服务；测试时注入 Mock 实现。
 * 子代理统一通过该接口访问模型，不直接持有 SDK。
 */
export interface LLMClient {
  /**
   * 完成一次推理
   *
   * @param request - LLM 请求
   * @param signal - 中断信号（超时/取消）
   */
  complete(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse>;
}

// ============================================================
// 科室子代理配置
// ============================================================

/** 权限模式 */
export type PermissionMode = 'bubble' | 'isolated' | 'delegated';

/** 记忆范围 */
export type MemoryScope = 'department' | 'personal' | 'hospital';

/**
 * 科室子代理配置
 *
 * 每个科室子代理对应一个配置对象，包含工具集、知识库、提示词、权限与超时。
 * 对应设计文档 §5.3 DepartmentAgentDefinition。
 */
export interface SpecialtyConfig {
  /** 代理类型标识（如 'internal-medicine'） */
  readonly agentType: string;
  /** 科室中文名 */
  readonly departmentName: string;
  /** 何时使用（供调度器 LLM 判断） */
  readonly whenToUse: string;
  /** 允许使用的工具名称白名单，'*' 表示全部 */
  readonly tools: readonly string[];
  /** 显式禁用的工具 */
  readonly disallowedTools: readonly string[];
  /** 预加载的临床路径技能 */
  readonly skills: readonly string[];
  /** 专业知识库范围描述 */
  readonly knowledgeBase: readonly string[];
  /** 系统提示词（科室专业模板） */
  readonly systemPrompt: string;
  /** 权限范围描述 */
  readonly permissions: readonly string[];
  /** 是否允许越权读取（急诊模式） */
  readonly emergencyOverride: boolean;
  /** 推荐模型 */
  readonly model: string;
  /** 推理力度 */
  readonly effort: 'low' | 'medium' | 'high';
  /** 权限模式 */
  readonly permissionMode: PermissionMode;
  /** 最大轮次 */
  readonly maxTurns: number;
  /** 超时（毫秒） */
  readonly timeoutMs: number;
  /** 记忆范围 */
  readonly memoryScope: MemoryScope;
  /** 典型任务示例 */
  readonly typicalTasks: readonly string[];
  /** 配置来源 */
  readonly source: 'built-in' | 'hospital' | 'department' | 'personal';
}

// ============================================================
// 子代理运行时
// ============================================================

/** 子代理状态 */
export type BuddyStatus =
  | 'idle' // 空闲
  | 'running' // 运行中
  | 'completed' // 已完成
  | 'failed' // 失败
  | 'timeout' // 超时
  | 'cancelled'; // 已取消

/** 子代理任务 */
export interface BuddyTask {
  /** 任务唯一ID */
  readonly taskId: string;
  /** 目标科室代理类型 */
  readonly agentType: string;
  /** 任务指令（自然语言） */
  readonly instruction: string;
  /** 患者ID */
  readonly patientId?: string;
  /** 就诊ID */
  readonly encounterId?: string;
  /** 优先级 */
  readonly priority: 'low' | 'normal' | 'high' | 'emergency';
  /** 截止时间戳 */
  readonly deadline?: number;
  /** 全链路追踪ID */
  readonly traceId: string;
}

/** 子代理执行结果 */
export interface BuddyResult {
  /** 任务ID */
  readonly taskId: string;
  /** 子代理实例ID */
  readonly buddyId: string;
  /** 科室类型 */
  readonly agentType: string;
  /** 状态 */
  readonly status: BuddyStatus;
  /** 结论摘要（不传递完整对话） */
  readonly summary: string;
  /** 调用的工具 */
  readonly toolsUsed: readonly string[];
  /** 置信度（0-1） */
  readonly confidence: number;
  /** 耗时（毫秒） */
  readonly durationMs: number;
  /** Token 用量 */
  readonly tokens: number;
  /** 错误信息（失败/超时时） */
  readonly error?: string;
  /** 完成时间戳 */
  readonly completedAt: number;
}

/** 子代理实例快照（供监控） */
export interface BuddySnapshot {
  /** 实例ID */
  readonly buddyId: string;
  /** 科室类型 */
  readonly agentType: string;
  /** 当前状态 */
  readonly status: BuddyStatus;
  /** 当前任务ID（运行中） */
  readonly currentTaskId?: string;
  /** 已完成任务数 */
  readonly completedTasks: number;
  /** 总运行时长（毫秒） */
  readonly totalRunMs: number;
}
