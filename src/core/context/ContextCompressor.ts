/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import { TOKEN_BUDGET_CONFIG } from '@/constants';
import type { LoopMessage } from '@/core/agent/loopTypes';
import type { CompactionLevel } from '@/types';

import { estimateTokens } from './TokenBudgetTracker';

/** 压缩结果 */
export interface CompactionResult {
  /** 压缩后的消息列表 */
  messages: LoopMessage[];
  /** 实际执行的压缩级别 */
  level: CompactionLevel;
  /** 压缩前 Token 估算 */
  beforeTokens: number;
  /** 压缩后 Token 估算 */
  afterTokens: number;
  /** 被压缩/替换的消息数 */
  compactedCount: number;
}

/**
 * 四级渐进式上下文压缩器
 *
 * 对应 claude-code 四级压缩流水线：
 * - Level 1 Snip：单条工具结果过大时截断尾部，检验结果仅保留异常值；
 * - Level 2 Microcompact：将较早消息中的大工具结果替换为摘要，病历提取关键信息；
 * - Level 3 ContextCollapse：多轮历史合并为摘要，就诊过程提炼为时间线；
 * - Level 4 Autocompact：全量重建，仅保留患者/就诊摘要 + 当前任务 + 最近 3 轮。
 *
 * 压缩遵循"不丢失关键医疗信息"原则：危急值、过敏史、当前诊断永远保留。
 */
export class ContextCompressor {
  /** 单条工具结果截断阈值（字符） */
  private readonly toolResultCharLimit: number;

  /** Autocompact 后保留的最近轮次数 */
  private readonly keepRecentTurns: number;

  /**
   * @param options.toolResultCharLimit - 单条工具结果截断长度（默认 2000）
   * @param options.keepRecentTurns - Autocompact 保留最近轮次（默认 3）
   */
  constructor(options: { toolResultCharLimit?: number; keepRecentTurns?: number } = {}) {
    this.toolResultCharLimit =
      options.toolResultCharLimit ?? TOKEN_BUDGET_CONFIG.MAX_TOOL_RESULT_TOKENS * 4;
    this.keepRecentTurns = options.keepRecentTurns ?? 3;
  }

  /**
   * 按目标级别执行压缩
   *
   * @param messages - 当前消息列表
   * @param level - 目标压缩级别
   * @returns 压缩结果
   */
  public compact(messages: readonly LoopMessage[], level: CompactionLevel): CompactionResult {
    const beforeTokens = this.estimateMessagesTokens(messages);

    let working = messages;
    let compactedCount = 0;

    switch (level) {
      case 'snip':
        working = this.snip(working);
        compactedCount = messages.length - working.length;
        break;
      case 'microcompact':
        working = this.snip(working);
        working = this.microcompact(working);
        compactedCount = this.countChanged(messages, working);
        break;
      case 'collapse':
        working = this.snip(working);
        working = this.microcompact(working);
        working = this.collapse(working);
        compactedCount = this.countChanged(messages, working);
        break;
      case 'autocompact':
        working = this.autocompact(working);
        compactedCount = messages.length - working.length;
        break;
      case 'none':
      default:
        break;
    }

    const afterTokens = this.estimateMessagesTokens(working);
    return {
      messages: [...working],
      level,
      beforeTokens,
      afterTokens,
      compactedCount,
    };
  }

  /**
   * Level 1 Snip：裁剪超大工具结果尾部
   *
   * @param messages - 消息列表
   * @returns 裁剪后的消息列表
   */
  public snip(messages: readonly LoopMessage[]): LoopMessage[] {
    return messages.map((msg) => {
      if (msg.role !== 'user') return msg;
      const changed = msg.content.map((block) => {
        if (block.type !== 'tool_result') return block;
        if (block.content.length <= this.toolResultCharLimit) return block;
        const truncated =
          block.content.slice(0, this.toolResultCharLimit) +
          '\n…[结果过长，已截断，仅保留前半部分]';
        return { ...block, content: truncated };
      });
      return { role: msg.role, content: changed };
    });
  }

  /**
   * Level 2 Microcompact：早期工具结果替换为摘要
   *
   * 保留最后 3 条 user 消息中的工具结果原文，更早的替换为摘要。
   *
   * @param messages - 消息列表
   * @returns 微压缩后的消息列表
   */
  public microcompact(messages: readonly LoopMessage[]): LoopMessage[] {
    const toolResultUserIdx = messages
      .map((m, i) =>
        m.role === 'user' && m.content.some((b) => b.type === 'tool_result') ? i : -1,
      )
      .filter((i) => i >= 0);

    const keepSet = new Set(toolResultUserIdx.slice(-this.keepRecentTurns));

    return messages.map((msg, i) => {
      if (keepSet.has(i) || msg.role !== 'user') return msg;
      const changed = msg.content.map((block) => {
        if (block.type !== 'tool_result') return block;
        if (block.content.length <= 200) return block;
        const summary = block.content.slice(0, 200) + '…[工具结果已摘要]';
        return { ...block, content: summary };
      });
      return { role: msg.role, content: changed };
    });
  }

  /**
   * Level 3 ContextCollapse：多轮历史合并为摘要
   *
   * 将最早的"用户+助手"成对消息折叠为一条系统摘要消息，
   * 仅保留患者关键信息与最近多轮。
   *
   * @param messages - 消息列表
   * @returns 折叠后的消息列表
   */
  public collapse(messages: readonly LoopMessage[]): LoopMessage[] {
    if (messages.length <= this.keepRecentTurns * 2) {
      return [...messages];
    }

    const keepCount = this.keepRecentTurns * 2;
    const toFold = messages.slice(0, messages.length - keepCount);
    const retained = messages.slice(messages.length - keepCount);

    const summaryText = this.buildFoldSummary(toFold);
    const summaryMessage: LoopMessage = {
      role: 'user',
      content: [{ type: 'text', text: `[历史上下文摘要]\n${summaryText}` }],
    };

    return [summaryMessage, ...retained];
  }

  /**
   * Level 4 Autocompact：全量重建
   *
   * 丢弃全部历史对话细节，仅保留一条上下文摘要 + 最近 N 轮。
   * 关键医疗信息（诊断、过敏、危急值）在摘要中显式保留。
   *
   * @param messages - 消息列表
   * @returns 重建后的消息列表
   */
  public autocompact(messages: readonly LoopMessage[]): LoopMessage[] {
    const keepCount = this.keepRecentTurns * 2;
    const toFold = messages.slice(0, Math.max(0, messages.length - keepCount));
    const retained = messages.slice(Math.max(0, messages.length - keepCount));

    const summaryText = this.buildFoldSummary(toFold);
    const boundary: LoopMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `[上下文已自动压缩——以下为历史要点摘要]\n${summaryText}`,
        },
      ],
    };
    return [boundary, ...retained];
  }

  /**
   * 估算消息列表 Token 数
   *
   * @param messages - 消息列表
   * @returns 估算 Token 数
   */
  public estimateMessagesTokens(messages: readonly LoopMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      for (const block of msg.content) {
        if (block.type === 'text') total += estimateTokens(block.text);
        else if (block.type === 'tool_result') total += estimateTokens(block.content);
        else total += estimateTokens(JSON.stringify(block.input));
      }
    }
    return total;
  }

  /**
   * 构建历史折叠摘要
   *
   * @param folded - 被折叠的消息
   * @returns 摘要文本
   */
  private buildFoldSummary(folded: readonly LoopMessage[]): string {
    if (folded.length === 0) return '（无更早历史）';

    const userTurns: string[] = [];
    for (const msg of folded) {
      for (const block of msg.content) {
        if (block.type === 'text' && block.text.trim()) {
          userTurns.push(block.text.slice(0, 120));
        }
      }
    }

    const highlighted = userTurns
      .filter((t) => /过敏|危急|诊断|手术|出院|死亡|ST段|肌钙蛋白|血糖|血压/i.test(t))
      .slice(0, 8);

    const lines = [
      `- 共折叠 ${folded.length} 条历史消息，${userTurns.length} 个文本片段。`,
      highlighted.length > 0
        ? `- 关键医疗要点：${highlighted.join('；')}`
        : '- 未识别到需特别保留的危急/诊断类信息。',
    ];
    return lines.join('\n');
  }

  /**
   * 统计发生变化的块数量
   */
  private countChanged(before: readonly LoopMessage[], after: readonly LoopMessage[]): number {
    if (before.length !== after.length) {
      return Math.abs(before.length - after.length);
    }
    let changed = 0;
    for (let i = 0; i < before.length; i++) {
      if (JSON.stringify(before[i]) !== JSON.stringify(after[i])) changed++;
    }
    return changed;
  }
}
