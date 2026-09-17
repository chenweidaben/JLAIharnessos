/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { TOKEN_BUDGET_CONFIG } from '@/constants';
import type { CompactionLevel, TokenBudget, TokenUsage } from '@/types';

/**
 * 压缩触发决策
 */
export interface CompactionDecision {
  /** 是否需要触发压缩 */
  shouldCompact: boolean;
  /** 建议压缩级别 */
  level: CompactionLevel;
  /** 当前使用百分比 */
  usagePercent: number;
}

/**
 * Token 预算追踪器
 *
 * 实时追踪输入/输出/总 Token 使用，维护各组成部分（系统提示词、患者摘要、
 * 就诊摘要、活跃医嘱、检验结果、工具结果、对话历史）的预算分配，
 * 并根据使用率判断是否触发四级渐进式压缩。
 *
 * 阈值参考 TOKEN_BUDGET_CONFIG：
 * - 60%  → Microcompact（Level 2）
 * - 80%  → ContextCollapse（Level 3）
 * - 95%  → Autocompact（Level 4）
 *
 * @example
 * ```typescript
 * const tracker = new TokenBudgetTracker({ totalTokens: 200_000 });
 * tracker.addUsage({ input: 1200, output: 300 });
 * const decision = tracker.evaluateCompaction();
 * ```
 */
export class TokenBudgetTracker {
  /** 总 Token 预算 */
  private readonly total: number;

  /** 输入 Token 累计 */
  private inputTokens = 0;

  /** 输出 Token 累计 */
  private outputTokens = 0;

  /** 各组成部分 Token 估算（用于预算分配监控） */
  private readonly componentTokens = {
    systemPrompt: 0,
    patientSummary: 0,
    encounterSummary: 0,
    activeOrders: 0,
    recentLabs: 0,
    toolResults: 0,
    conversationHistory: 0,
  };

  /**
   * 创建 Token 预算追踪器
   *
   * @param options - 配置项
   * @param options.totalTokens - 总上下文 Token 预算（默认 200000）
   */
  constructor(options: { totalTokens?: number } = {}) {
    this.total = options.totalTokens ?? TOKEN_BUDGET_CONFIG.DEFAULT_TOTAL_TOKENS;
  }

  /**
   * 累加一轮 LLM 调用的 Token 使用
   *
   * @param usage - Token 使用量（input/output）
   */
  public addUsage(usage: { input: number; output: number }): void {
    this.inputTokens += Math.max(0, usage.input);
    this.outputTokens += Math.max(0, usage.output);
  }

  /**
   * 设置某组成部分的 Token 估算
   *
   * @param component - 组成部分名
   * @param tokens - Token 数
   */
  public setComponent(
    component: keyof TokenBudgetTracker['componentTokens'],
    tokens: number,
  ): void {
    this.componentTokens[component] = Math.max(0, tokens);
  }

  /**
   * 获取当前 Token 使用量
   *
   * @returns Token 使用量快照
   */
  public getUsage(): TokenUsage {
    return {
      input: this.inputTokens,
      output: this.outputTokens,
      total: this.inputTokens + this.outputTokens,
    };
  }

  /**
   * 获取当前 Token 预算状态
   *
   * @returns 预算状态（used/total/percentage）
   */
  public getBudget(): TokenBudget {
    const used = this.getUsage().total;
    const percentage = this.total > 0 ? (used / this.total) * 100 : 0;
    return { used, total: this.total, percentage: Math.round(percentage * 100) / 100 };
  }

  /**
   * 获取各组成部分 Token 数
   *
   * @returns 组成部分 Token 映射
   */
  public getComponents(): Readonly<typeof this.componentTokens> {
    return { ...this.componentTokens };
  }

  /**
   * 计算当前上下文使用率（0-100）
   *
   * 基于已注入各组成部分之和 + 累计对话输入估算。
   *
   * @returns 使用率百分比
   */
  public getUsagePercent(): number {
    const composed =
      Object.values(this.componentTokens).reduce((a, b) => a + b, 0) + this.getUsage().total;
    return this.total > 0 ? (composed / this.total) * 100 : 0;
  }

  /**
   * 评估是否需要触发压缩
   *
   * @returns 压缩决策
   */
  public evaluateCompaction(): CompactionDecision {
    const usagePercent = this.getUsagePercent();

    if (usagePercent >= TOKEN_BUDGET_CONFIG.AUTOCOMPACT_THRESHOLD_PERCENT) {
      return {
        shouldCompact: true,
        level: 'autocompact',
        usagePercent,
      };
    }
    if (usagePercent >= TOKEN_BUDGET_CONFIG.COLLAPSE_THRESHOLD_PERCENT) {
      return { shouldCompact: true, level: 'collapse', usagePercent };
    }
    if (usagePercent >= TOKEN_BUDGET_CONFIG.MICROCOMPACT_THRESHOLD_PERCENT) {
      return { shouldCompact: true, level: 'microcompact', usagePercent };
    }
    return { shouldCompact: false, level: 'none', usagePercent };
  }

  /**
   * 判断单条工具结果是否过大（触发 Snip）
   *
   * @param resultTokens - 工具结果估算 Token 数
   * @returns 是否超过单条工具结果预算
   */
  public isToolResultOversized(resultTokens: number): boolean {
    return resultTokens > TOKEN_BUDGET_CONFIG.MAX_TOOL_RESULT_TOKENS;
  }

  /**
   * 重置累计 Token（会话切换或全量压缩后）
   *
   * @param keepComponents - 是否保留组成部分估算（默认 false）
   */
  public reset(keepComponents = false): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
    if (!keepComponents) {
      for (const key of Object.keys(
        this.componentTokens,
      ) as (keyof typeof this.componentTokens)[]) {
        this.componentTokens[key] = 0;
      }
    }
  }
}

/**
 * 基于字符数的启发式 Token 估算
 *
 * 中文约 1.5 字符/Token，英文约 4 字符/Token，取折中估算。
 * 用于在缺少精确 usage 时预估上下文大小。
 *
 * @param text - 待估算文本
 * @returns 估算 Token 数
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // 中文占比高，按约 1.6 字符/Token 估算
  return Math.ceil(text.length / 1.6);
}
