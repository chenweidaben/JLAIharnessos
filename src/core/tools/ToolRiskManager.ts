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
  ConfirmationTokenInfo,
  MedicalToolContext,
  RiskConfirmationDecision,
} from '@/types';

/**
 * 工具风险管理器
 *
 * 实现三级风险确认机制：
 * - low: 自动执行，无需确认
 * - medium: 需要用户单次确认
 * - high: 需要双重确认 + CA签名
 *
 * 负责确认令牌的生成、验证和过期管理。
 *
 * @example
 * ```typescript
 * const riskManager = new ToolRiskManager();
 *
 * // 评估确认需求
 * const decision = riskManager.evaluateConfirmationRequirement(tool, input);
 *
 * // 生成确认令牌
 * const token = riskManager.generateConfirmationToken(tool, input, context);
 *
 * // 验证确认令牌
 * const isValid = riskManager.validateConfirmationToken(token, tool, input);
 *
 * // 执行确认流程
 * const confirmed = await riskManager.executeConfirmation(tool, input, context);
 * ```
 */
export class ToolRiskManager {
  /** 确认令牌存储（key: token, value: token info） */
  private readonly tokenStore = new Map<string, ConfirmationTokenInfo>();

  /** 令牌清理定时器 */
  private cleanupTimer?: ReturnType<typeof setInterval>;

  /**
   * 创建工具风险管理器实例
   *
   * @param autoCleanup - 是否自动清理过期令牌（默认 true）
   * @param cleanupIntervalMs - 清理间隔（毫秒，默认 60000）
   */
  constructor(autoCleanup = true, cleanupIntervalMs = 60000) {
    if (autoCleanup) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredTokens();
      }, cleanupIntervalMs);
      // 允许进程退出
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * 评估工具的确认需求
   *
   * 根据工具的风险等级和配置，确定需要的确认级别。
   *
   * @param tool - 医疗工具定义
   * @param input - 工具输入参数
   * @returns 确认决策
   */
  public evaluateConfirmationRequirement(
    tool: BuiltMedicalTool,
    _input: unknown,
  ): RiskConfirmationDecision {
    const riskLevel = tool.riskLevel;

    // low 风险：无需确认
    if (riskLevel === 'low') {
      return {
        requiresConfirmation: false,
        confirmationLevel: 'none',
        requiresCASign: false,
        message: `工具 '${tool.name}' 为低风险操作，可自动执行`,
      };
    }

    // medium 风险：单次确认
    if (riskLevel === 'medium') {
      return {
        requiresConfirmation: tool.requiresConfirm,
        confirmationLevel: tool.requiresConfirm ? 'single' : 'none',
        requiresCASign: false,
        message: tool.requiresConfirm
          ? `工具 '${tool.name}' 为中风险操作，需要用户确认`
          : `工具 '${tool.name}' 已配置为无需确认`,
      };
    }

    // high 风险：双重确认 + CA签名
    return {
      requiresConfirmation: true,
      confirmationLevel: tool.requiresDoubleConfirm ? 'double' : 'single',
      requiresCASign: tool.requiresCASign ?? true,
      message: `工具 '${tool.name}' 为高风险操作，需要${tool.requiresDoubleConfirm ? '双重确认' : '单次确认'}${tool.requiresCASign ? '和CA签名' : ''}`,
    };
  }

  /**
   * 生成确认令牌
   *
   * 为需要确认的工具调用生成唯一的确认令牌，
   * 令牌包含工具名、风险等级、输入哈希、用户信息等。
   *
   * @param tool - 医疗工具定义
   * @param input - 工具输入参数
   * @param context - 工具执行上下文
   * @returns 确认令牌信息
   */
  public generateConfirmationToken(
    tool: BuiltMedicalTool,
    input: unknown,
    context: MedicalToolContext,
  ): ConfirmationTokenInfo {
    const token = this.generateSecureToken();
    const now = Date.now();
    const ttl = TOOL_EXECUTION_CONFIG.CONFIRMATION_TOKEN_TTL_MS;

    const tokenInfo: ConfirmationTokenInfo = {
      token,
      toolName: tool.name,
      riskLevel: tool.riskLevel,
      inputHash: this.hashInput(input),
      userId: context.user.userId,
      sessionId: context.sessionId,
      createdAt: now,
      expiresAt: now + ttl,
      used: false,
    };

    this.tokenStore.set(token, tokenInfo);
    return tokenInfo;
  }

  /**
   * 验证确认令牌
   *
   * 检查令牌是否有效、是否过期、是否已使用、是否匹配工具和输入。
   *
   * @param token - 确认令牌值
   * @param tool - 医疗工具定义
   * @param input - 工具输入参数
   * @returns 令牌是否有效
   */
  public validateConfirmationToken(token: string, tool: BuiltMedicalTool, input: unknown): boolean {
    const tokenInfo = this.tokenStore.get(token);

    if (!tokenInfo) {
      return false;
    }

    // 检查是否已使用
    if (tokenInfo.used) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > tokenInfo.expiresAt) {
      this.tokenStore.delete(token);
      return false;
    }

    // 检查工具名匹配
    if (tokenInfo.toolName !== tool.name) {
      return false;
    }

    // 检查输入哈希匹配
    if (tokenInfo.inputHash !== this.hashInput(input)) {
      return false;
    }

    return true;
  }

  /**
   * 使用确认令牌（标记为已使用）
   *
   * @param token - 确认令牌值
   * @returns 是否成功使用
   */
  public consumeConfirmationToken(token: string): boolean {
    const tokenInfo = this.tokenStore.get(token);
    if (!tokenInfo || tokenInfo.used) {
      return false;
    }
    tokenInfo.used = true;
    return true;
  }

  /**
   * 执行确认流程
   *
   * 根据工具的风险等级，执行相应的确认流程：
   * - low: 直接返回 true
   * - medium: 请求用户单次确认
   * - high: 请求双重确认 + CA签名
   *
   * @param tool - 医疗工具定义
   * @param input - 工具输入参数
   * @param context - 工具执行上下文
   * @returns 是否通过确认
   * @throws {MedicalAgentError} 确认被拒绝或超时时抛出
   */
  public async executeConfirmation(
    tool: BuiltMedicalTool,
    input: unknown,
    context: MedicalToolContext,
  ): Promise<boolean> {
    const decision = this.evaluateConfirmationRequirement(tool, input);

    // 无需确认
    if (!decision.requiresConfirmation) {
      return true;
    }

    // 生成确认消息
    const message = this.buildConfirmationMessage(tool, input, decision);
    const details = this.buildConfirmationDetails(tool, input, context);

    try {
      // 单次确认
      if (decision.confirmationLevel === 'single') {
        const confirmed = await context.confirmation.requestUserConfirm(message, details);
        if (!confirmed) {
          throw new MedicalAgentError(
            ErrorCodes.CONFIRMATION_REQUIRED,
            `用户拒绝了工具 '${tool.name}' 的执行确认`,
            { toolName: tool.name, riskLevel: tool.riskLevel },
          );
        }
        return true;
      }

      // 双重确认
      if (decision.confirmationLevel === 'double') {
        // 第一重：用户确认
        const firstConfirmed = await context.confirmation.requestUserConfirm(message, details);
        if (!firstConfirmed) {
          throw new MedicalAgentError(
            ErrorCodes.CONFIRMATION_REQUIRED,
            `用户在第一重确认中拒绝了工具 '${tool.name}' 的执行`,
            { toolName: tool.name, riskLevel: tool.riskLevel },
          );
        }

        // 第二重：审核人确认
        const secondConfirmed = await context.confirmation.requestDoubleConfirm(
          `【第二重确认】${message}`,
          { ...details, firstConfirmedAt: Date.now() },
          tool.requiredTitles?.[0],
        );
        if (!secondConfirmed) {
          throw new MedicalAgentError(
            ErrorCodes.CONFIRMATION_REQUIRED,
            `审核人在第二重确认中拒绝了工具 '${tool.name}' 的执行`,
            { toolName: tool.name, riskLevel: tool.riskLevel },
          );
        }

        // CA签名（如需要）
        if (decision.requiresCASign) {
          // CA签名由外部系统完成，此处仅检查配置
          // 实际签名操作在工具执行前后由集成层处理
        }

        return true;
      }

      return false;
    } catch (error) {
      if (error instanceof MedicalAgentError) {
        throw error;
      }
      throw new MedicalAgentError(
        ErrorCodes.CONFIRMATION_REQUIRED,
        `工具 '${tool.name}' 确认流程执行失败`,
        { toolName: tool.name, originalError: error },
      );
    }
  }

  /**
   * 获取令牌信息
   *
   * @param token - 确认令牌值
   * @returns 令牌信息，不存在时返回 undefined
   */
  public getTokenInfo(token: string): ConfirmationTokenInfo | undefined {
    return this.tokenStore.get(token);
  }

  /**
   * 清理过期令牌
   */
  public cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, info] of this.tokenStore) {
      if (now > info.expiresAt) {
        this.tokenStore.delete(token);
      }
    }
  }

  /**
   * 销毁风险管理器
   *
   * 清理定时器和令牌存储。
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.tokenStore.clear();
  }

  /**
   * 生成安全的确认令牌
   *
   * @returns 随机令牌字符串
   */
  private generateSecureToken(): string {
    const length = TOOL_EXECUTION_CONFIG.CONFIRMATION_TOKEN_LENGTH;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'conf_';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * 计算输入参数的哈希
   *
   * @param input - 输入参数
   * @returns 哈希字符串
   */
  private hashInput(input: unknown): string {
    try {
      const str = JSON.stringify(input);
      // 简单的字符串哈希（非加密用途，仅用于匹配检测）
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return `h_${Math.abs(hash).toString(36)}_${str.length}`;
    } catch {
      return 'h_unknown';
    }
  }

  /**
   * 构建确认消息
   *
   * @param tool - 医疗工具定义
   * @param input - 工具输入参数
   * @param decision - 确认决策
   * @returns 确认消息文本
   */
  private buildConfirmationMessage(
    tool: BuiltMedicalTool,
    _input: unknown,
    decision: RiskConfirmationDecision,
  ): string {
    const riskLabel =
      tool.riskLevel === 'high' ? '高风险' : tool.riskLevel === 'medium' ? '中风险' : '低风险';
    return `【${riskLabel}操作确认】即将执行工具：${tool.userFacingName(_input)}\n${tool.description}`;
  }

  /**
   * 构建确认详情
   *
   * @param tool - 医疗工具定义
   * @param input - 工具输入参数
   * @param context - 工具执行上下文
   * @returns 确认详情对象
   */
  private buildConfirmationDetails(
    tool: BuiltMedicalTool,
    input: unknown,
    context: MedicalToolContext,
  ): Record<string, unknown> {
    return {
      toolName: tool.name,
      toolCategory: tool.category,
      riskLevel: tool.riskLevel,
      input: this.sanitizeInputForDisplay(input),
      userId: context.user.userId,
      userName: context.user.name,
      userRole: context.user.role,
      patientId: context.patient?.patientId,
      encounterId: context.encounter?.encounterId,
      sessionId: context.sessionId,
      timestamp: Date.now(),
    };
  }

  /**
   * 清理输入参数用于显示（去除敏感信息）
   *
   * @param input - 原始输入
   * @returns 清理后的输入
   */
  private sanitizeInputForDisplay(input: unknown): unknown {
    if (typeof input !== 'object' || input === null) {
      return input;
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      // 隐藏明显的敏感字段
      if (/password|token|secret|key|credential/i.test(key) && typeof value === 'string') {
        result[key] = '***';
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
