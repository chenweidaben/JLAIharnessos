/**
 * MEDMUSE Sentinel 审批网关 - 人在回路（human-in-the-loop）策略裁决与工单落库。
 *
 * 医疗安全红线：
 *   - info     只读/低风险，直接放行；
 *   - warning  写临床文书/影响建议，需用户本人二次确认（ctx.confirmed=true）；
 *   - critical 影响诊疗决策，需上级审批，且 approver ≠ requester；
 *   - 任何 DB/配置异常一律 fail-closed（拒绝自动放行）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { RiskLevel } from './toolRegistry';
import {
  createApproval as repoCreateApproval,
  getApprovalById as repoGetApproval,
  listApprovals as repoListApprovals,
  resolveApproval as repoResolveApproval,
  expireStaleApprovals as repoExpireStale,
} from './medmuseRepo';

export interface SentinelContext {
  userId: string;
  sessionId: string;
  /** warning 级工具必须由用户本人确认后才放行 */
  confirmed?: boolean;
  /** 当前用户角色（用于 critical 级审批人校验，M89-B 从 JWT 取） */
  userRole?: string;
}

export interface SentinelDecision {
  approved: boolean;
  requiresApproval: boolean;
  reason: string;
}

/**
 * 风险裁决。fail-closed：任何异常都拒绝自动放行。
 */
export function evaluate(
  toolName: string,
  riskLevel: RiskLevel,
  ctx: SentinelContext,
): SentinelDecision {
  try {
    switch (riskLevel) {
      case 'info':
        return { approved: true, requiresApproval: false, reason: `工具 ${toolName} 为 info 级（只读），直接放行。` };
      case 'warning':
        if (ctx.confirmed) {
          return { approved: true, requiresApproval: false, reason: `工具 ${toolName} 为 warning 级，用户已二次确认，放行。` };
        }
        return { approved: false, requiresApproval: true, reason: `工具 ${toolName} 为 warning 级，需用户本人二次确认。` };
      case 'critical':
        return { approved: false, requiresApproval: true, reason: `工具 ${toolName} 为 critical 级，Sentinel 兜底拦截，必须经上级审批（审批人不得与申请人相同）。` };
    }
  } catch (err) {
    return {
      approved: false,
      requiresApproval: true,
      reason: `SENTINEL_UNAVAILABLE_FAIL_CLOSED: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** 状态机：pending -> approved | rejected | expired */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export async function createApprovalTicket(opts: {
  messageId: string;
  toolName: string;
  args: Record<string, unknown>;
  riskLevel: RiskLevel;
  requestedBy: string;
}) {
  return repoCreateApproval({
    messageId: opts.messageId,
    action: {
      toolName: opts.toolName,
      args: opts.args,
      riskLevel: opts.riskLevel,
      reason: opts.riskLevel === 'critical' ? '需上级审批' : '需用户二次确认',
    },
    riskLevel: opts.riskLevel,
    requestedBy: opts.requestedBy,
  });
}

/**
 * 审批决议。critical 级不允许申请人自己批准自己。
 */
export async function resolveApprovalTicket(opts: {
  approvalId: string;
  approved: boolean;
  approvedBy: string;
  requesterId?: string;
  riskLevel?: RiskLevel;
  rejectionReason?: string;
}) {
  if (
    opts.approved &&
    opts.riskLevel === 'critical' &&
    opts.requesterId &&
    opts.requesterId === opts.approvedBy
  ) {
    throw new Error('SELF_APPROVAL_FORBIDDEN');
  }
  return repoResolveApproval({
    approvalId: opts.approvalId,
    approved: opts.approved,
    approvedBy: opts.approvedBy,
    rejectionReason: opts.rejectionReason,
  });
}

/** 扫描 pending 且过期的审批单，批量置为 expired（由定时器/路由入口调用） */
export async function expireStaleApprovals(): Promise<number> {
  return repoExpireStale();
}

export { repoGetApproval as getApprovalById, repoListApprovals as listApprovals };
