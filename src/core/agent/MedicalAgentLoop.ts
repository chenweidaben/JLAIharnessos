/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { TOKEN_BUDGET_CONFIG } from '@/constants';
import { ContextCompressor } from '@/core/context/ContextCompressor';
import {
  MedicalContextBuilder,
  type MedicalContextData,
} from '@/core/context/MedicalContextBuilder';
import { TokenBudgetTracker } from '@/core/context/TokenBudgetTracker';
import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import type { AgentEventBus } from '@/core/events/AgentEventBus';
import { type ToolExecutor } from '@/core/tools/ToolExecutor';
import type {
  BuiltMedicalTool,
  MedicalToolContext,
  MedicalUser,
  ToolExecutionResult,
} from '@/types';

import type { ILLMClient } from './LLMClient';
import type { LLMStreamEvent, LoopContentBlock, LoopMessage, LoopToolUseBlock } from './loopTypes';
import { type MedicalTaskType, SystemPromptBuilder } from './SystemPromptBuilder';

// ============================================================
// 主循环事件
// ============================================================

/** 主循环异步生成器产出事件 */
export type MedicalAgentLoopEvent =
  | { type: 'response_start'; timestamp: number }
  | { type: 'response_delta'; text: string; timestamp: number }
  | { type: 'response_end'; text: string; timestamp: number }
  | {
      type: 'tool_call_start';
      callId: string;
      toolName: string;
      input: Record<string, unknown>;
      timestamp: number;
    }
  | {
      type: 'tool_call_end';
      callId: string;
      toolName: string;
      success: boolean;
      summary: string;
      durationMs: number;
      timestamp: number;
    }
  | {
      type: 'tool_confirmation_required';
      callId: string;
      toolName: string;
      confirmationToken: string;
      message: string;
      timestamp: number;
    }
  | {
      type: 'context_compaction';
      level: string;
      beforeTokens: number;
      afterTokens: number;
      timestamp: number;
    }
  | { type: 'turn_end'; turn: number; toolCallsThisTurn: number; timestamp: number }
  | { type: 'interrupted'; reason: string; timestamp: number }
  | { type: 'error'; message: string; timestamp: number }
  | {
      type: 'done';
      output: string;
      toolCalls: readonly LoopToolUseBlock[];
      turns: number;
      totalToolCalls: number;
      tokensUsed: { input: number; output: number };
      timestamp: number;
    };

/**
 * 主循环运行输入
 */
export interface MedicalAgentLoopInput {
  /** 用户输入 */
  userInput: string;
  /** 会话ID */
  sessionId: string;
  /** 当前用户 */
  user: MedicalUser;
  /** 当前患者/就诊/医嘱/检验上下文 */
  medicalData?: MedicalContextData;
  /** 科室（系统提示词用） */
  department?: string;
  /** 任务类型 */
  taskType?: MedicalTaskType;
  /** 可用工具 */
  tools: readonly BuiltMedicalTool[];
  /** 工具执行上下文 */
  toolContext: MedicalToolContext;
  /** 历史消息（续接已有会话） */
  history?: readonly LoopMessage[];
  /** 最大轮次（默认 20） */
  maxTurns?: number;
  /** 最大工具调用次数（默认 30） */
  maxToolCalls?: number;
  /** 最大输出 Token（默认 8192） */
  maxOutputTokens?: number;
}

/** 确认请求回调（由 QueryEngine/UI 层注入） */
export type ConfirmationResolver = (info: {
  callId: string;
  toolName: string;
  confirmationToken: string;
  message: string;
}) => Promise<boolean>;

/**
 * MedicalAgentLoop 依赖
 */
export interface MedicalAgentLoopDeps {
  llm: ILLMClient;
  executor: ToolExecutor;
  eventBus: AgentEventBus;
  contextBuilder?: MedicalContextBuilder;
  compressor?: ContextCompressor;
  promptBuilder?: SystemPromptBuilder;
  budgetTracker?: TokenBudgetTracker;
  /** 高/中风险工具确认回调 */
  onConfirm?: ConfirmationResolver;
}

/**
 * 医疗化 Agent 主循环
 *
 * 基于 claude-code query.ts 的状态机式 while(true) 循环：
 *
 * ```
 * while (true) {
 *   ① 上下文预处理（预算评估 → 必要时四级压缩）
 *   ② 构建系统提示词 + 医疗上下文
 *   ③ 流式调用 LLM，解析文本 / 工具调用
 *   ④ 文本输出 → 流式渲染；工具调用 → 校验→确认→执行→回收结果
 *   ⑤ 终止条件：end_turn / 达到最大轮次 / 预算耗尽 / 用户中断
 * }
 * ```
 *
 * 通过 Async Generator 向外发射事件，QueryEngine 既订阅事件总线又消费生成器，
 * 实现 UI 渲染与主循环解耦。
 */
export class MedicalAgentLoop {
  private readonly llm: ILLMClient;
  private readonly executor: ToolExecutor;
  private readonly eventBus: AgentEventBus;
  private readonly contextBuilder: MedicalContextBuilder;
  private readonly compressor: ContextCompressor;
  private readonly promptBuilder: SystemPromptBuilder;
  private readonly budgetTracker: TokenBudgetTracker;
  private readonly onConfirm?: ConfirmationResolver;

  /**
   * @param deps - 依赖集合
   */
  constructor(deps: MedicalAgentLoopDeps) {
    this.llm = deps.llm;
    this.executor = deps.executor;
    this.eventBus = deps.eventBus;
    this.contextBuilder = deps.contextBuilder ?? new MedicalContextBuilder();
    this.compressor = deps.compressor ?? new ContextCompressor();
    this.promptBuilder = deps.promptBuilder ?? new SystemPromptBuilder();
    this.budgetTracker = deps.budgetTracker ?? new TokenBudgetTracker();
    this.onConfirm = deps.onConfirm;
  }

  /**
   * 运行主循环
   *
   * @param input - 运行输入
   * @returns 主循环事件异步生成器
   */
  public async *run(input: MedicalAgentLoopInput): AsyncGenerator<MedicalAgentLoopEvent> {
    const maxTurns = input.maxTurns ?? 20;
    const maxToolCalls = input.maxToolCalls ?? 30;
    const maxOutputTokens = input.maxOutputTokens ?? TOKEN_BUDGET_CONFIG.MAX_OUTPUT_TOKENS;

    // 初始化消息
    const messages: LoopMessage[] = input.history ? [...input.history] : [];
    // 注入医疗上下文（作为首条 user 消息的前置说明）
    const medicalCtx = this.contextBuilder.build(input.medicalData ?? {});
    this.budgetTracker.setComponent('patientSummary', medicalCtx.tokens.patientSummary);
    this.budgetTracker.setComponent('encounterSummary', medicalCtx.tokens.encounterSummary);
    this.budgetTracker.setComponent(
      'toolResults',
      medicalCtx.tokens.activeOrders + medicalCtx.tokens.recentLabs,
    );

    const contextPrefix = medicalCtx.text
      ? `${medicalCtx.text}\n\n---\n用户问题：${input.userInput}`
      : input.userInput;

    messages.push({
      role: 'user',
      content: [{ type: 'text', text: contextPrefix }],
    });

    let turn = 0;
    let totalToolCalls = 0;
    let finalOutput = '';
    const allToolCalls: LoopToolUseBlock[] = [];

    yield { type: 'response_start', timestamp: Date.now() };

    // 中断信号透传
    const signal = input.toolContext.signal;

    while (turn < maxTurns) {
      turn++;

      // 检查中断
      if (signal?.aborted) {
        yield { type: 'interrupted', reason: 'user_aborted', timestamp: Date.now() };
        this.publish(input.sessionId, 'interrupted', { reason: 'user_aborted' });
        return;
      }

      // ① 上下文压缩评估
      const decision = this.budgetTracker.evaluateCompaction();
      if (decision.shouldCompact) {
        const result = this.compressor.compact(messages, decision.level);
        messages.length = 0;
        messages.push(...result.messages);
        yield {
          type: 'context_compaction',
          level: decision.level,
          beforeTokens: result.beforeTokens,
          afterTokens: result.afterTokens,
          timestamp: Date.now(),
        };
        this.publish(input.sessionId, 'context_compaction', {
          level: decision.level,
          beforeTokens: result.beforeTokens,
          afterTokens: result.afterTokens,
        });
      }

      // ② 系统提示词
      const system = this.promptBuilder.build({
        user: input.user,
        department: input.department ?? input.user.department,
        taskType: input.taskType ?? 'general',
        tools: input.tools,
      });
      const toolDefs = this.promptBuilder.buildToolDefinitions(input.tools);

      // ③ 流式调用 LLM
      let assistantText = '';
      const turnToolCalls: LoopToolUseBlock[] = [];
      // id → name 映射（tool_use_end 事件不含 name）
      const toolNameById = new Map<string, string>();

      try {
        for await (const event of this.llm.streamChat({
          system,
          messages,
          tools: toolDefs,
          maxTokens: maxOutputTokens,
          signal,
        })) {
          const mapped = this.mapStreamEvent(event, input.sessionId);
          if (mapped) yield mapped;

          if (event.type === 'text_delta') {
            assistantText += event.text;
          } else if (event.type === 'tool_use_start') {
            toolNameById.set(event.id, event.name);
          } else if (event.type === 'tool_use_end') {
            turnToolCalls.push({
              type: 'tool_use',
              id: event.id,
              name: toolNameById.get(event.id) ?? 'unknown_tool',
              input: event.input,
            });
          }
        }
      } catch (error) {
        const err =
          error instanceof MedicalAgentError
            ? error
            : MedicalAgentError.from(error, ErrorCodes.EXTERNAL_SYSTEM_ERROR);
        yield { type: 'error', message: err.message, timestamp: Date.now() };
        this.publish(input.sessionId, 'error', { code: err.code, message: err.message });
        return;
      }

      // ④ 无工具调用 → 文本回答完成
      if (turnToolCalls.length === 0) {
        finalOutput = assistantText;
        yield { type: 'response_end', text: assistantText, timestamp: Date.now() };
        this.publish(input.sessionId, 'response_end', { text: assistantText });
        break;
      }

      // 工具调用预算检查
      if (totalToolCalls + turnToolCalls.length > maxToolCalls) {
        yield {
          type: 'error',
          message: `工具调用次数超过预算（${maxToolCalls}），停止执行`,
          timestamp: Date.now(),
        };
        finalOutput = assistantText || '已达到工具调用上限，未给出最终结论。';
        break;
      }

      // 记录 assistant 消息（文本 + 工具调用块）
      const assistantContent: LoopContentBlock[] = [];
      if (assistantText.trim()) {
        assistantContent.push({ type: 'text', text: assistantText });
      }
      for (const call of turnToolCalls) {
        assistantContent.push(call);
      }
      messages.push({ role: 'assistant', content: assistantContent });
      allToolCalls.push(...turnToolCalls);

      // ⑤ 执行工具并回收结果
      const toolResultBlocks: LoopContentBlock[] = [];
      for (const call of turnToolCalls) {
        if (signal?.aborted) {
          yield { type: 'interrupted', reason: 'user_aborted', timestamp: Date.now() };
          return;
        }

        totalToolCalls++;
        yield {
          type: 'tool_call_start',
          callId: call.id,
          toolName: call.name,
          input: call.input,
          timestamp: Date.now(),
        };
        this.publish(
          input.sessionId,
          'tool_call_start',
          {
            toolName: call.name,
            callId: call.id,
          },
          call.id,
        );

        let result: ToolExecutionResult;
        const tool = input.tools.find((t) => t.name === call.name);

        if (!tool) {
          result = {
            executionId: call.id,
            toolName: call.name,
            success: false,
            error: {
              code: ErrorCodes.TOOL_NOT_FOUND,
              message: `Tool '${call.name}' is not available`,
              errorType: 'not_found',
              retryable: false,
            },
            durationMs: 0,
            tokens: 0,
          };
        } else if (tool.isReadOnly(call.input)) {
          result = await this.executor.execute(call.name, call.input, input.toolContext);
        } else {
          // 写入类工具：执行一次（ToolExecutor 内部完成风险确认判定）
          result = await this.executor.execute(call.name, call.input, input.toolContext);

          // 需要用户确认 → 通过外部回调解析
          if (result.requiresUserConfirmation && result.confirmationToken) {
            const confirmed = await this.resolveConfirmation({
              callId: call.id,
              toolName: call.name,
              confirmationToken: result.confirmationToken,
              message: result.confirmationRequirement?.message ?? '请确认操作',
            });
            if (confirmed) {
              result = await this.executor.executeWithConfirmation(
                call.name,
                call.input,
                input.toolContext,
                result.confirmationToken,
              );
            } else {
              result = {
                executionId: call.id,
                toolName: call.name,
                success: false,
                error: {
                  code: ErrorCodes.CONFIRMATION_REQUIRED,
                  message: '用户拒绝了该操作确认',
                  errorType: 'confirmation',
                  retryable: false,
                },
                durationMs: 0,
                tokens: 0,
              };
            }
          }
        }

        const summary = this.summarizeResult(result);
        yield {
          type: 'tool_call_end',
          callId: call.id,
          toolName: call.name,
          success: result.success,
          summary,
          durationMs: result.durationMs,
          timestamp: Date.now(),
        };
        this.publish(
          input.sessionId,
          'tool_call_end',
          {
            toolName: call.name,
            callId: call.id,
            success: result.success,
            summary,
          },
          call.id,
        );

        toolResultBlocks.push({
          type: 'tool_result',
          toolUseId: call.id,
          isError: !result.success,
          content: summary,
        });
      }

      // 将工具结果作为 user 消息回传
      messages.push({ role: 'user', content: toolResultBlocks });

      yield {
        type: 'turn_end',
        turn,
        toolCallsThisTurn: turnToolCalls.length,
        timestamp: Date.now(),
      };

      // 累计 Token
      this.budgetTracker.addUsage({ input: 0, output: 0 });
    }

    if (turn >= maxTurns && !finalOutput) {
      finalOutput = assistantTextFallback(messages);
    }

    yield {
      type: 'done',
      output: finalOutput,
      toolCalls: allToolCalls,
      turns: turn,
      totalToolCalls,
      tokensUsed: this.budgetTracker.getUsage(),
      timestamp: Date.now(),
    };
  }

  /**
   * 映射 LLM 流式事件为主循环事件
   */
  private mapStreamEvent(event: LLMStreamEvent, _sessionId: string): MedicalAgentLoopEvent | null {
    switch (event.type) {
      case 'text_delta':
        return { type: 'response_delta', text: event.text, timestamp: event.timestamp };
      case 'tool_use_start':
      case 'tool_use_input_delta':
      case 'message_delta':
      case 'message_start':
      case 'message_stop':
      case 'tool_use_end':
        return null;
      default:
        return null;
    }
  }

  /**
   * 解析确认请求
   */
  private async resolveConfirmation(info: {
    callId: string;
    toolName: string;
    confirmationToken: string;
    message: string;
  }): Promise<boolean> {
    if (!this.onConfirm) return false;
    try {
      return await this.onConfirm(info);
    } catch {
      return false;
    }
  }

  /**
   * 摘要工具结果
   */
  private summarizeResult(result: ToolExecutionResult): string {
    if (result.success) {
      try {
        const str = JSON.stringify(result.output);
        return str.length > 2000 ? str.slice(0, 2000) + '…[truncated]' : str;
      } catch {
        return String(result.output);
      }
    }
    return `[错误] ${result.error?.message ?? '执行失败'}`;
  }

  /**
   * 发布事件到总线
   */
  private publish(
    sessionId: string,
    type: Parameters<AgentEventBus['publish']>[0]['type'],
    data: unknown,
    toolCallId?: string,
  ): void {
    this.eventBus.publish({
      type,
      sessionId,
      data,
      toolCallId,
      timestamp: Date.now(),
    });
  }
}

/**
 * 从历史消息中提取最后的 assistant 文本（兜底）
 */
function assistantTextFallback(messages: readonly LoopMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant') continue;
    for (const block of msg.content) {
      if (block.type === 'text' && block.text.trim()) return block.text;
    }
  }
  return '已达到最大轮次，未产出完整结论。';
}
