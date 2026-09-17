/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { TOOL_EXECUTION_CONFIG } from '@/constants';
import { ErrorCodes, MedicalAgentError } from '@/core/errors';
import type {
  BuiltMedicalTool,
  MedicalToolContext,
  ToolCall,
  ToolExecutionError,
  ToolExecutionEvent,
  ToolExecutionResult,
} from '@/types';

import { checkToolAvailability, validateToolInput } from './buildMedicalTool';
import { type MedicalToolRegistry } from './MedicalToolRegistry';
import { type ToolRiskManager } from './ToolRiskManager';

/**
 * 工具执行器
 *
 * 负责医疗工具的实际执行，支持：
 * - 单工具执行
 * - 批量并行执行（只读分区，最大并发10）
 * - 批量串行执行（写入分区）
 * - 超时控制
 * - 中断支持
 * - 执行结果收集与处理
 *
 * 基于 claude-code StreamingToolExecutor 模式，增加医疗风险管控。
 *
 * @example
 * ```typescript
 * const executor = new ToolExecutor(registry, riskManager);
 *
 * // 单工具执行
 * const result = await executor.execute('query_patient', { patientId: 'P001' }, context);
 *
 * // 批量并行执行
 * const results = await executor.executeBatchParallel(toolCalls, context);
 *
 * // 批量串行执行
 * const results = await executor.executeBatchSerial(toolCalls, context);
 * ```
 */
export class ToolExecutor {
  private readonly registry: MedicalToolRegistry;
  private readonly riskManager: ToolRiskManager;

  /**
   * 创建工具执行器实例
   *
   * @param registry - 工具注册中心
   * @param riskManager - 工具风险管理器
   */
  constructor(registry: MedicalToolRegistry, riskManager: ToolRiskManager) {
    this.registry = registry;
    this.riskManager = riskManager;
  }

  /**
   * 执行单个工具
   *
   * 完整执行流程：
   * 1. 查找工具
   * 2. 检查工具可用性
   * 3. 参数校验
   * 4. 权限检查
   * 5. 医疗级输入校验
   * 6. 风险确认
   * 7. 执行工具（带超时和中断控制）
   * 8. 结果处理
   * 9. 审计日志
   *
   * @param toolName - 工具名称
   * @param input - 工具输入参数
   * @param context - 工具执行上下文
   * @returns 工具执行结果
   */
  public async execute(
    toolName: string,
    input: Record<string, unknown>,
    context: MedicalToolContext,
  ): Promise<ToolExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      // 1. 查找工具
      const tool = this.registry.getOrThrow(toolName);

      // 2. 检查工具可用性
      const availability = checkToolAvailability(tool, context);
      if (!availability.available) {
        return this.buildErrorResult(
          executionId,
          toolName,
          ErrorCodes.PERMISSION_DENIED,
          availability.reason ?? 'Tool is not available',
          'permission',
          startTime,
        );
      }

      // 3. 参数校验
      let validatedInput: unknown;
      try {
        validatedInput = validateToolInput(tool, input);
      } catch (error) {
        return this.buildErrorResult(
          executionId,
          toolName,
          ErrorCodes.VALIDATION_ERROR,
          error instanceof Error ? error.message : 'Input validation failed',
          'validation',
          startTime,
        );
      }

      // 4. 权限检查（医疗级）
      const permissionResult = await tool.checkMedicalPermissions(validatedInput, context);
      if (!permissionResult.allowed) {
        return this.buildErrorResult(
          executionId,
          toolName,
          ErrorCodes.PERMISSION_DENIED,
          permissionResult.reason ?? 'Permission denied',
          'permission',
          startTime,
          {
            requiredPermission: permissionResult.requiredPermission,
            suggestedAction: permissionResult.suggestedAction,
          },
        );
      }

      // 5. 医疗级输入校验
      const validationResult = await tool.validateMedicalInput(validatedInput, context);
      if (!validationResult.valid) {
        const errors = validationResult.errors
          .filter((e) => e.severity === 'error')
          .map((e) => `${e.field}: ${e.message}`);
        if (errors.length > 0) {
          return this.buildErrorResult(
            executionId,
            toolName,
            ErrorCodes.VALIDATION_ERROR,
            `Medical validation failed: ${errors.join('; ')}`,
            'validation',
            startTime,
            { validationErrors: validationResult.errors },
          );
        }
      }

      // 6. 风险确认
      const decision = this.riskManager.evaluateConfirmationRequirement(tool, validatedInput);
      if (decision.requiresConfirmation) {
        const tokenInfo = this.riskManager.generateConfirmationToken(tool, validatedInput, context);
        return {
          executionId,
          toolName,
          success: false,
          durationMs: Date.now() - startTime,
          tokens: 0,
          requiresUserConfirmation: true,
          confirmationToken: tokenInfo.token,
          confirmationRequirement: {
            level: tool.riskLevel,
            message: decision.message,
            details: {
              input: validatedInput,
              riskLevel: tool.riskLevel,
            },
          },
        };
      }

      // 7. 执行工具（带超时和中断控制）
      const output = await this.executeWithTimeoutAndAbort(tool, validatedInput, context);

      // 8. 记录审计日志
      if (tool.requiresAudit) {
        await context.logAudit({
          toolName: tool.name,
          toolCategory: tool.category,
          riskLevel: tool.riskLevel,
          input: this.sanitizeForAudit(input),
          outputSummary: this.summarizeOutput(output),
          success: true,
          durationMs: Date.now() - startTime,
        });
      }

      // 9. 返回成功结果
      return {
        executionId,
        toolName,
        success: true,
        output,
        durationMs: Date.now() - startTime,
        tokens: 0,
      };
    } catch (error) {
      // 处理中断
      if (context.isAborted?.()) {
        return this.buildErrorResult(
          executionId,
          toolName,
          ErrorCodes.TOOL_INTERRUPTED,
          'Tool execution was interrupted',
          'interrupted',
          startTime,
        );
      }

      // 处理 MedicalAgentError
      if (error instanceof MedicalAgentError) {
        const errorType = this.mapErrorCodeToType(error.code);
        return this.buildErrorResult(
          executionId,
          toolName,
          error.code,
          error.message,
          errorType,
          startTime,
          error.details,
        );
      }

      // 处理超时
      if (error instanceof Error && error.name === 'TimeoutError') {
        return this.buildErrorResult(
          executionId,
          toolName,
          ErrorCodes.TOOL_TIMEOUT,
          `Tool '${toolName}' execution timed out`,
          'timeout',
          startTime,
        );
      }

      // 处理未知错误
      return this.buildErrorResult(
        executionId,
        toolName,
        ErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        'internal',
        startTime,
        { originalError: error },
      );
    }
  }

  /**
   * 批量并行执行工具（只读分区）
   *
   * 所有工具并行执行，最大并发数由配置决定（默认10）。
   * 适用于只读、低风险工具的批量查询。
   *
   * @param toolCalls - 工具调用列表
   * @param context - 工具执行上下文
   * @param maxConcurrency - 最大并发数（默认10）
   * @returns 工具执行结果列表（与输入顺序一致）
   */
  public async executeBatchParallel(
    toolCalls: readonly ToolCall[],
    context: MedicalToolContext,
    maxConcurrency: number = TOOL_EXECUTION_CONFIG.MAX_CONCURRENT_TOOLS,
  ): Promise<ToolExecutionResult[]> {
    if (toolCalls.length === 0) return [];

    const results: ToolExecutionResult[] = new Array<ToolExecutionResult>(toolCalls.length);
    let index = 0;

    /**
     * 工作者函数：从队列中取任务执行
     */
    const worker = async (): Promise<void> => {
      while (index < toolCalls.length) {
        const currentIndex = index++;
        const call = toolCalls[currentIndex];
        results[currentIndex] = await this.execute(call.toolName, call.input, context);
      }
    };

    // 启动工作者
    const workerCount = Math.min(maxConcurrency, toolCalls.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);

    return results;
  }

  /**
   * 批量串行执行工具（写入分区）
   *
   * 所有工具按顺序逐个执行，前一个工具的上下文修改会影响后一个。
   * 适用于写入、中高风险工具的批量操作。
   *
   * @param toolCalls - 工具调用列表
   * @param context - 工具执行上下文
   * @param stopOnError - 遇到错误时是否停止执行（默认 true）
   * @returns 工具执行结果列表
   */
  public async executeBatchSerial(
    toolCalls: readonly ToolCall[],
    context: MedicalToolContext,
    stopOnError = true,
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const call of toolCalls) {
      // 检查中断
      if (context.isAborted?.()) {
        results.push({
          executionId: this.generateExecutionId(),
          toolName: call.toolName,
          success: false,
          error: {
            code: ErrorCodes.TOOL_INTERRUPTED,
            message: 'Batch execution was interrupted',
            errorType: 'interrupted',
            retryable: false,
          },
          durationMs: 0,
          tokens: 0,
        });
        break;
      }

      const result = await this.execute(call.toolName, call.input, context);
      results.push(result);

      // 遇到错误时停止
      if (stopOnError && !result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * 流式执行工具
   *
   * 以异步生成器方式返回执行过程中的事件，
   * 支持实时进度反馈和确认请求。
   *
   * @param toolName - 工具名称
   * @param input - 工具输入参数
   * @param context - 工具执行上下文
   * @returns 执行事件异步生成器
   */
  public async *executeStreaming(
    toolName: string,
    input: Record<string, unknown>,
    context: MedicalToolContext,
  ): AsyncGenerator<ToolExecutionEvent> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    yield {
      type: 'start',
      executionId,
      toolName,
      timestamp: Date.now(),
    };

    try {
      const result = await this.execute(toolName, input, context);

      if (result.requiresUserConfirmation && result.confirmationToken) {
        yield {
          type: 'confirmation_required',
          executionId,
          token: result.confirmationToken,
          message: result.confirmationRequirement?.message ?? '请确认操作',
          timestamp: Date.now(),
        };
      }

      yield {
        type: 'complete',
        executionId,
        result,
        timestamp: Date.now(),
      };
    } catch (error) {
      yield {
        type: 'error',
        executionId,
        error: {
          code: error instanceof MedicalAgentError ? error.code : ErrorCodes.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          errorType: 'internal',
          retryable: false,
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 使用确认令牌继续执行工具
   *
   * 当工具执行返回需要确认时，使用确认令牌继续执行。
   *
   * @param toolName - 工具名称
   * @param input - 工具输入参数
   * @param context - 工具执行上下文
   * @param confirmationToken - 确认令牌
   * @returns 工具执行结果
   */
  public async executeWithConfirmation(
    toolName: string,
    input: Record<string, unknown>,
    context: MedicalToolContext,
    confirmationToken: string,
  ): Promise<ToolExecutionResult> {
    const tool = this.registry.getOrThrow(toolName);

    // 验证确认令牌
    const isValid = this.riskManager.validateConfirmationToken(confirmationToken, tool, input);
    if (!isValid) {
      return this.buildErrorResult(
        this.generateExecutionId(),
        toolName,
        ErrorCodes.INVALID_CONFIRMATION_TOKEN,
        'Confirmation token is invalid or expired',
        'confirmation',
        Date.now(),
      );
    }

    // 消费令牌
    this.riskManager.consumeConfirmationToken(confirmationToken);

    // 执行确认流程（此时令牌已验证，直接通过）
    // 注意：实际的用户确认操作已经在外部完成，此处直接执行工具
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      const validatedInput = validateToolInput(tool, input);
      const output = await this.executeWithTimeoutAndAbort(tool, validatedInput, context);

      // 记录审计日志
      if (tool.requiresAudit) {
        await context.logAudit({
          toolName: tool.name,
          toolCategory: tool.category,
          riskLevel: tool.riskLevel,
          input: this.sanitizeForAudit(input),
          outputSummary: this.summarizeOutput(output),
          success: true,
          durationMs: Date.now() - startTime,
          confirmation: {
            confirmed: true,
            confirmedAt: Date.now(),
            confirmationToken,
          },
        });
      }

      return {
        executionId,
        toolName,
        success: true,
        output,
        durationMs: Date.now() - startTime,
        tokens: 0,
      };
    } catch (error) {
      if (error instanceof MedicalAgentError) {
        return this.buildErrorResult(
          executionId,
          toolName,
          error.code,
          error.message,
          this.mapErrorCodeToType(error.code),
          startTime,
          error.details,
        );
      }
      return this.buildErrorResult(
        executionId,
        toolName,
        ErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Unknown error',
        'internal',
        startTime,
      );
    }
  }

  /**
   * 带超时和中断控制的工具执行
   *
   * @param tool - 医疗工具
   * @param input - 已校验的输入参数
   * @param context - 工具执行上下文
   * @returns 工具输出
   */
  private async executeWithTimeoutAndAbort(
    tool: BuiltMedicalTool,
    input: unknown,
    context: MedicalToolContext,
  ): Promise<unknown> {
    const timeoutMs = tool.timeout ?? context.timeoutMs ?? TOOL_EXECUTION_CONFIG.DEFAULT_TIMEOUT_MS;

    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        const error = new Error(`Tool '${tool.name}' execution timed out after ${timeoutMs}ms`);
        error.name = 'TimeoutError';
        reject(error);
      }, timeoutMs);
      // 允许进程退出
      if (timer.unref) timer.unref();
    });

    // 创建执行 Promise
    const executePromise = tool.execute(input, context);

    // 如果有中断信号，创建中断 Promise
    if (context.signal) {
      const abortPromise = new Promise<never>((_, reject) => {
        context.signal!.addEventListener(
          'abort',
          () => {
            reject(
              new MedicalAgentError(
                ErrorCodes.TOOL_INTERRUPTED,
                `Tool '${tool.name}' execution was aborted`,
              ),
            );
          },
          { once: true },
        );
      });

      return Promise.race([executePromise, timeoutPromise, abortPromise]);
    }

    return Promise.race([executePromise, timeoutPromise]);
  }

  /**
   * 构建错误结果
   */
  private buildErrorResult(
    executionId: string,
    toolName: string,
    code: string,
    message: string,
    errorType: ToolExecutionError['errorType'],
    startTime: number,
    details?: Record<string, unknown>,
  ): ToolExecutionResult {
    return {
      executionId,
      toolName,
      success: false,
      error: {
        code,
        message,
        details,
        errorType,
        retryable: errorType === 'timeout' || errorType === 'external_system',
      },
      durationMs: Date.now() - startTime,
      tokens: 0,
    };
  }

  /**
   * 将错误码映射到错误类型
   */
  private mapErrorCodeToType(code: string): ToolExecutionError['errorType'] {
    switch (code) {
      case ErrorCodes.VALIDATION_ERROR:
        return 'validation';
      case ErrorCodes.PERMISSION_DENIED:
        return 'permission';
      case ErrorCodes.UNAUTHENTICATED:
        return 'authentication';
      case ErrorCodes.TOOL_TIMEOUT:
        return 'timeout';
      case ErrorCodes.TOOL_INTERRUPTED:
        return 'interrupted';
      case ErrorCodes.CONFIRMATION_REQUIRED:
      case ErrorCodes.INVALID_CONFIRMATION_TOKEN:
        return 'confirmation';
      case ErrorCodes.EXTERNAL_SYSTEM_ERROR:
        return 'external_system';
      case ErrorCodes.TOOL_NOT_FOUND:
        return 'not_found';
      default:
        return 'internal';
    }
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `exec_${timestamp}_${random}`;
  }

  /**
   * 清理输入用于审计（去除敏感信息）
   */
  private sanitizeForAudit(input: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (/password|token|secret|key|credential/i.test(key)) {
        result[key] = '***';
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * 摘要输出结果
   */
  private summarizeOutput(output: unknown): string {
    if (output === null || output === undefined) {
      return 'null';
    }
    try {
      const str = JSON.stringify(output);
      return str.length > 500 ? str.substring(0, 500) + '...' : str;
    } catch {
      // JSON.stringify 失败（如循环引用）时的兜底展示，有意用 String() 降级为可读字符串
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(output);
    }
  }
}
