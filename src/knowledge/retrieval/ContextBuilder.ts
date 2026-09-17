/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 检索上下文构建器（Context Builder）。
 * 将检索结果组织为 LLM 可用的上下文格式，每个结果标注内容、来源、证据等级、
 * 发布日期，带引用编号以支持证据追溯；并按 token 预算裁剪。
 */

import type { RetrievalResult } from '../types';
import { DEFAULT_CONTEXT_TOKEN_BUDGET, estimateTokens } from '../types';

/** 构建后的上下文 */
export interface BuiltContext {
  /** 注入到 Prompt 的增强上下文文本（含引用编号与参考文献） */
  contextText: string;
  /** 实际使用的 token 数 */
  usedTokens: number;
  /** 入选的检索结果（按最终顺序，带引用编号） */
  selected: RetrievalResult[];
  /** 是否因 token 预算发生截断 */
  truncated: boolean;
}

/**
 * 检索上下文构建器。
 *
 * 将 Top-N 检索结果格式化为结构化 Prompt 片段：
 * 每条知识带 [n] 引用编号，文末附参考文献列表（来源、版本、发布日期、权威性）。
 * 严格控制总 token 不超过预算，优先保留高相关 / 高权威片段。
 */
export class ContextBuilder {
  /** 默认 token 预算 */
  private readonly tokenBudget: number;

  /**
   * 创建上下文构建器
   *
   * @param tokenBudget - token 预算，默认 DEFAULT_CONTEXT_TOKEN_BUDGET
   */
  constructor(tokenBudget: number = DEFAULT_CONTEXT_TOKEN_BUDGET) {
    this.tokenBudget = tokenBudget;
  }

  /**
   * 构建 LLM 可用上下文。
   *
   * @param results - 已重排序的检索结果（按相关性降序）
   * @param options - 可选预算覆盖
   * @returns 构建后的上下文
   */
  build(results: readonly RetrievalResult[], options?: { tokenBudget?: number }): BuiltContext {
    const budget = options?.tokenBudget ?? this.tokenBudget;

    // 按预算贪心选取（结果已按相关性降序，前面的更相关）
    const selected: RetrievalResult[] = [];
    let usedTokens = 0;
    let truncated = false;

    // 预留参考文献列表与标题的 token 开销
    const overheadTokens = 120;
    for (const r of results) {
      const chunkTokens = estimateTokens(r.content) + 40; // 40 为引用标注开销
      if (usedTokens + chunkTokens + overheadTokens > budget) {
        truncated = true;
        break;
      }
      selected.push(r);
      usedTokens += chunkTokens;
    }

    // 拼装正文
    const lines: string[] = ['以下为检索到的医学知识（按相关性排序，[n] 为引用编号）：'];
    selected.forEach((r, idx) => {
      const cite = `[${idx + 1}]`;
      const levelTag = r.evidenceLevel ? `（证据等级 ${r.evidenceLevel}）` : '';
      const caution = r.caution ? ` ⚠ ${r.caution}` : '';
      lines.push(`${cite} 【${r.docTitle}｜${r.sectionPath}】${levelTag}${caution}\n${r.content}`);
    });

    // 拼装参考文献
    lines.push('', '参考文献：');
    selected.forEach((r, idx) => {
      lines.push(
        `[${idx + 1}] ${r.docTitle}, ${r.publisher}, ${r.publishDate}, 版本 ${r.version}（权威性 ${'★'.repeat(r.authorityScore)}）`,
      );
    });

    const contextText = lines.join('\n');
    usedTokens = estimateTokens(contextText);

    return { contextText, usedTokens, selected, truncated };
  }
}
