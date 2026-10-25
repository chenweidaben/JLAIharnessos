/**
 * 短期记忆：近期消息滑窗与 checkpoint（契约 §7）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 仅在进程内保留最近 n 条消息上下文；checkpoint 供 DEMO 运行时与单测使用，
 * 不写库、不携带原始入参之外的敏感落盘内容。
 */

import { nowIso } from '../roleSupport';
import type { ConsultMessage } from '../types';

/** 短期记忆 checkpoint 结构 */
export interface MemoryCheckpoint {
  threadId: string;
  checkpointAt: string;
  messageCount: number;
  messages: ConsultMessage[];
}

/**
 * 取历史消息最近 n 条（滑窗，保持时间顺序）
 *
 * @param history 全量历史消息（按时间升序）
 * @param n 保留条数，默认 20
 */
export function recentMessages(history: ConsultMessage[], n = 20): ConsultMessage[] {
  if (n <= 0) {
    return [];
  }
  return history.slice(-n);
}

/**
 * 生成线程消息 checkpoint（快照，供 DEMO 运行时持久化到进程内存）
 *
 * @param threadId 会话线程 ID
 * @param messages 待快照消息列表
 */
export function checkpoint(threadId: string, messages: ConsultMessage[]): MemoryCheckpoint {
  return {
    threadId,
    checkpointAt: nowIso(),
    messageCount: messages.length,
    messages: [...messages],
  };
}
