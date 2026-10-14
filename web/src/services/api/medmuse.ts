/**
 * 健澜科技 jlmedaios - MEDMUSE 审批中心 API（Sentinel 人在回路审批）
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * 医疗安全：POST decide 必须携带 Idempotency-Key 请求头，否则后端返回 400；
 *           critical 级审批不允许申请人自己批准自己（后端 403 SELF_APPROVAL_FORBIDDEN）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import http, { get } from '../request';
import type { ApiResponse } from '@/types/api';

/** 工单状态机：pending -> approved | rejected | expired */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type RiskLevel = 'info' | 'warning' | 'critical';

/** action JSON（后端落库形态）：被拦截工具及其参数 */
export interface MedmuseApprovalAction {
  toolName: string;
  args?: Record<string, unknown>;
  riskLevel?: RiskLevel;
  reason?: string;
}

/** 与后端 MedmuseApprovalRow 对齐 */
export interface MedmuseApproval {
  id: string;
  message_id: string;
  action: MedmuseApprovalAction;
  status: ApprovalStatus;
  risk_level: RiskLevel;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  expires_at: string;
  created_at: string;
}

/** decide 请求体：approved 必填布尔；驳回时 comment 为驳回理由 */
export interface MedmuseDecalBody {
  approved: boolean;
  comment?: string;
}

/** 生成幂等键（浏览器优先 randomUUID，退化到时间戳+随机串） */
function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** 审批工单列表（先经后端 expireStaleApprovals 清扫过期单，按创建时间倒序） */
export function listApprovals(status: ApprovalStatus = 'pending'): Promise<MedmuseApproval[]> {
  return get<MedmuseApproval[]>('/medmuse/approvals', { status });
}

/**
 * 审批决议：通过/驳回。
 * 必须带 Idempotency-Key 头；现有 post() helper 不透传自定义头，
 * 故走默认 axios 实例直连，成功信封解包 res.data.data。
 */
export function decideApproval(
  approvalId: string,
  body: MedmuseDecalBody,
): Promise<MedmuseApproval> {
  return http
    .request<ApiResponse<MedmuseApproval>>({
      url: `/medmuse/approvals/${approvalId}/decide`,
      method: 'post',
      data: body,
      headers: { 'Idempotency-Key': makeIdempotencyKey() },
    })
    .then((res) => res.data.data);
}
