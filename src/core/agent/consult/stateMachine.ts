/**
 * 咨询会话状态机（契约 §2）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 转移表由契约冻结；急症 escalated 旁路优先于任何角色编排；
 * closed / aborted 为终态；非法转移必须显式抛错，不得静默跳转。
 */

import type { ThreadStatus } from './types';

/** 合法状态转移表：from -> 允许的 to 列表 */
export const THREAD_TRANSITIONS: Record<ThreadStatus, ThreadStatus[]> = {
  idle: ['collecting', 'escalated', 'closed'],
  collecting: ['clarifying', 'drafting', 'escalated', 'closed', 'aborted'],
  clarifying: ['collecting', 'drafting', 'escalated', 'closed', 'aborted'],
  drafting: ['review_pending', 'escalated', 'closed', 'aborted'],
  review_pending: ['drafting', 'closed', 'aborted'],
  escalated: ['closed', 'aborted'],
  closed: [],
  aborted: [],
};

/** 判断 from -> to 是否为合法转移 */
export function canTransition(from: ThreadStatus, to: ThreadStatus): boolean {
  return THREAD_TRANSITIONS[from].includes(to);
}

/** 断言转移合法；非法转移抛出 Error，携带 from / to 便于审计定位 */
export function assertTransition(from: ThreadStatus, to: ThreadStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`非法状态转移: ${from} -> ${to}`);
  }
}

/** 判断状态是否为终态（closed / aborted），终态拒绝新消息 */
export function isTerminalStatus(status: ThreadStatus): boolean {
  return status === 'closed' || status === 'aborted';
}
