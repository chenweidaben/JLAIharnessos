/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { MedicalContextData } from '@/core/context/MedicalContextBuilder';
import { MedicalAgentError } from '@/core/errors';
import { AgentEventBus } from '@/core/events/AgentEventBus';
import { MedicalToolContextImpl } from '@/core/tools/MedicalToolContext';
import { type MedicalToolRegistry } from '@/core/tools/MedicalToolRegistry';
import { ToolExecutor } from '@/core/tools/ToolExecutor';
import { ToolRiskManager } from '@/core/tools/ToolRiskManager';
import type {
  AgentResponse,
  AuditLogger,
  BuiltMedicalTool,
  ConfirmationCallbacks,
  MedicalConfig,
  MedicalToolContext,
  MedicalUser,
  PermissionChecker,
  SessionState,
  SessionStatus,
} from '@/types';

import { type ILLMClient, LLMClient, type LLMClientConfig } from './LLMClient';
import {
  type ConfirmationResolver,
  MedicalAgentLoop,
  type MedicalAgentLoopEvent,
} from './MedicalAgentLoop';
import type { MedicalTaskType } from './SystemPromptBuilder';

/**
 * QueryEngine 配置
 */
export interface QueryEngineConfig {
  /** LLM 客户端（未提供时按 llmConfig 新建） */
  llm?: ILLMClient;
  /** LLM 客户端配置（llm 未提供时生效） */
  llmConfig?: LLMClientConfig;
  /** 工具注册中心 */
  registry: MedicalToolRegistry;
  /** 风险管理器（未提供时新建） */
  riskManager?: ToolRiskManager;
  /** 事件总线（未提供时新建） */
  eventBus?: AgentEventBus;
  /** 最大轮次 */
  maxTurns?: number;
  /** 最大工具调用次数 */
  maxToolCalls?: number;
}

/**
 * 一次查询的输入
 */
export interface QueryInput {
  /** 会话ID */
  sessionId: string;
  /** 当前用户 */
  user: MedicalUser;
  /** 用户输入 */
  userInput: string;
  /** 医疗数据（患者/就诊/医嘱/检验） */
  medicalData?: MedicalContextData;
  /** 科室 */
  department?: string;
  /** 任务类型 */
  taskType?: MedicalTaskType;
  /** 可用工具名（不指定则使用注册中心全部） */
  toolNames?: readonly string[];
}

/**
 * QueryEngine 查询引擎
 *
 * 管理 Agent 会话生命周期与运行状态，对外暴露：
 * - 流式查询 `query()`：Async Generator 产出事件；
 * - 状态查询 `getState()`；
 * - 中断 `interrupt()`；
 * - 事件总线 `events` 供 UI 订阅。
 *
 * 基于 claude-code SDK 模式的 QueryEngine：主循环在 MedicalAgentLoop，
 * QueryEngine 负责装配上下文、会话状态机与事件出口。
 */
export class QueryEngine {
  private readonly llm: ILLMClient;
  private readonly registry: MedicalToolRegistry;
  private readonly riskManager: ToolRiskManager;
  private readonly executor: ToolExecutor;
  private readonly eventBus: AgentEventBus;
  private readonly config: { maxTurns: number; maxToolCalls: number };

  /** 当前会话状态 */
  private status: SessionStatus = 'idle';

  /** 当前 AbortController（用于中断） */
  private abortController: AbortController | null = null;

  /** 当前会话ID */
  private activeSessionId?: string;

  /** 消息计数 */
  private messageCount = 0;

  /** 会话起始时间 */
  private sessionStart = Date.now();

  /** 最后活动时间 */
  private lastActivity = Date.now();

  /** 当前执行工具名 */
  private currentTool?: string;

  /**
   * @param config - 引擎配置
   */
  constructor(config: QueryEngineConfig) {
    this.registry = config.registry;
    this.riskManager = config.riskManager ?? new ToolRiskManager();
    this.executor = new ToolExecutor(this.registry, this.riskManager);
    this.eventBus = config.eventBus ?? new AgentEventBus();
    this.llm = config.llm ?? new LLMClient(config.llmConfig ?? {});
    this.config = {
      maxTurns: config.maxTurns ?? 20,
      maxToolCalls: config.maxToolCalls ?? 30,
    };
  }

  /** 事件总线（供 UI 订阅） */
  public get events(): AgentEventBus {
    return this.eventBus;
  }

  /**
   * 当前运行状态
   */
  public getState(): SessionState {
    const { input, output } = this.llm.getCumulativeUsage();
    const total = input + output;
    return {
      status: this.status,
      currentTool: this.currentTool,
      messageCount: this.messageCount,
      tokenUsage: { input, output, total },
      tokenBudget: {
        used: total,
        total: 200_000,
        percentage: Math.round((total / 200_000) * 10000) / 100,
      },
      startTime: this.sessionStart,
      lastActivityTime: this.lastActivity,
    };
  }

  /**
   * 执行一次查询（流式）
   *
   * @param input - 查询输入
   * @param deps - 额外依赖（工具上下文组件、确认回调）
   * @returns 主循环事件异步生成器
   */
  public async *query(
    input: QueryInput,
    deps: {
      audit: AuditLogger;
      permissionChecker: PermissionChecker;
      confirmation: ConfirmationCallbacks;
      config: MedicalConfig;
      onConfirm?: ConfirmationResolver;
    },
  ): AsyncGenerator<MedicalAgentLoopEvent> {
    this.activeSessionId = input.sessionId;
    this.sessionStart = Date.now();
    this.lastActivity = Date.now();
    this.abortController = new AbortController();

    // 解析可用工具
    const tools = this.resolveTools(input.toolNames);

    // 构建工具执行上下文
    const toolContext: MedicalToolContext = new MedicalToolContextImpl({
      user: input.user,
      patient: input.medicalData?.patient,
      encounter: input.medicalData?.encounter,
      sessionId: input.sessionId,
      audit: deps.audit,
      permissionChecker: deps.permissionChecker,
      confirmation: deps.confirmation,
      config: deps.config,
      signal: this.abortController.signal,
      timeoutMs: deps.config.defaultToolTimeoutMs,
    });

    this.setState('thinking');

    const loop = new MedicalAgentLoop({
      llm: this.llm,
      executor: this.executor,
      eventBus: this.eventBus,
      onConfirm: deps.onConfirm,
    });

    try {
      for await (const event of loop.run({
        sessionId: input.sessionId,
        userInput: input.userInput,
        user: input.user,
        medicalData: input.medicalData,
        department: input.department,
        taskType: input.taskType,
        tools,
        toolContext,
        maxTurns: this.config.maxTurns,
        maxToolCalls: this.config.maxToolCalls,
      })) {
        this.lastActivity = Date.now();
        this.refreshStateFromEvent(event);
        yield event;

        if (event.type === 'done') {
          this.setState('idle');
          this.messageCount++;
        } else if (event.type === 'interrupted' || event.type === 'error') {
          this.setState('interrupted');
        }
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * 中断当前查询
   */
  public interrupt(reason = 'user_interrupt'): void {
    this.abortController?.abort(reason);
    this.setState('interrupted');
    this.eventBus.publish({
      type: 'interrupted',
      sessionId: this.activeSessionId ?? 'unknown',
      data: { reason },
      timestamp: Date.now(),
    });
  }

  /**
   * 解析可用工具列表
   */
  private resolveTools(toolNames?: readonly string[]): BuiltMedicalTool[] {
    if (!toolNames || toolNames.length === 0) {
      return this.registry.list() as BuiltMedicalTool[];
    }
    const result: BuiltMedicalTool[] = [];
    for (const name of toolNames) {
      const tool = this.registry.get(name);
      if (tool) result.push(tool);
    }
    return result;
  }

  /**
   * 设置会话状态
   */
  private setState(status: SessionStatus): void {
    this.status = status;
  }

  /**
   * 根据主循环事件刷新状态
   */
  private refreshStateFromEvent(event: MedicalAgentLoopEvent): void {
    switch (event.type) {
      case 'response_start':
      case 'response_delta':
        this.status = 'responding';
        break;
      case 'tool_call_start':
        this.status = 'tool_executing';
        this.currentTool = event.toolName;
        break;
      case 'tool_call_end':
        this.currentTool = undefined;
        this.status = 'thinking';
        break;
      case 'tool_confirmation_required':
        this.status = 'waiting_confirm';
        break;
      case 'done':
      case 'interrupted':
      case 'error':
        break;
    }
  }

  /**
   * 构建最终 AgentResponse（查询结束后调用）
   *
   * @param params - 聚合参数
   * @returns AgentResponse
   */
  public buildResponse(params: {
    requestId: string;
    sessionId: string;
    output: string;
    success: boolean;
    durationMs: number;
    error?: { code: string; message: string };
  }): AgentResponse {
    return {
      responseId: `resp_${Date.now().toString(36)}`,
      requestId: params.requestId,
      sessionId: params.sessionId,
      agentId: 'medical-main-loop',
      success: params.success,
      output: params.output,
      toolCalls: [],
      toolResults: [],
      confidence: params.success ? 0.8 : 0,
      durationMs: params.durationMs,
      tokens: this.llm.getCumulativeUsage().input + this.llm.getCumulativeUsage().output,
      error: params.error,
      timestamp: Date.now(),
    };
  }
}
