/**
 * 健澜科技 jlmedaios - 抗菌药物管理（AMS）API（M14-A）
 *
 * 真实 BFF（src/bff/routes/ams.ts），全部读写 PostgreSQL，无 mock。
 * 路径相对（baseURL 已含 /api/v1），禁止再带 /api/v1 前缀。
 *
 * 医疗安全：AI 不自主开抗菌药；特殊使用级须会诊审批；点评为规则建议，最终判定由药师/医师签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';
import type {
  AmxCheckResult,
  AmxMetricsResponse,
  AmxReview,
  AmxReviewType,
  AmxUsageRecord,
  AntibioticCatalogItem,
  AtcLevel,
  PrescriberGrant,
  SpecialApproval,
} from '@/types/ams';

/* ------------------------------ 抗菌药目录 ------------------------------ */

/** 抗菌药目录（可按分级/药理分类过滤）。 */
export function listCatalog(params?: {
  atcLevel?: AtcLevel;
  pharmClass?: string;
}): Promise<AntibioticCatalogItem[]> {
  return get<AntibioticCatalogItem[]>('/ams/catalog', {
    ...(params?.atcLevel ? { atcLevel: params.atcLevel } : {}),
    ...(params?.pharmClass ? { pharmClass: params.pharmClass } : {}),
  });
}

/* ------------------------------ 处方授权 ------------------------------- */

/** 后端授权对象（含 prescriberTitle/prescriberUsername）→ 前端 PrescriberGrant（title）。 */
function mapGrant(raw: PrescriberGrant & { prescriberTitle?: string | null }): PrescriberGrant {
  const { prescriberTitle, ...rest } = raw;
  return { ...rest, title: prescriberTitle ?? raw.title ?? null };
}

/** 医师抗菌药处方授权列表。 */
export async function listPrescribers(): Promise<PrescriberGrant[]> {
  const rows = await get<Array<PrescriberGrant & { prescriberTitle?: string | null }>>('/ams/grants');
  return rows.map(mapGrant);
}

/** 授予/调整医师最高可开分级（需 ams:audit）。 */
export async function grantPrescriber(body: {
  prescriberId: string;
  maxLevel: AtcLevel;
}): Promise<PrescriberGrant> {
  const row = await post<PrescriberGrant & { prescriberTitle?: string | null }>('/ams/grants', body);
  return mapGrant(row);
}

/* ---------------------------- 特殊使用级审批 ---------------------------- */

/** 申请特殊使用级（须经抗菌药物管理工作组会诊审批，未审批不得入医嘱）。 */
export function createSpecialApproval(body: {
  visitId: string;
  drugId: string;
  indication: string;
}): Promise<SpecialApproval> {
  return post<SpecialApproval>('/ams/special-approvals', body);
}

/** 特殊使用级审批列表（可按 status 过滤）。 */
export function listSpecialApprovals(params?: {
  status?: 'pending' | 'approved' | 'rejected';
}): Promise<SpecialApproval[]> {
  return get<SpecialApproval[]>('/ams/special-approvals', {
    ...(params?.status ? { status: params.status } : {}),
  });
}

/** 审批通过（附会诊意见/会诊专家）。 */
export function approveSpecialApproval(
  id: string,
  body: { consultationOpinion: string; consultantId?: string },
): Promise<SpecialApproval> {
  return post<SpecialApproval>(`/ams/special-approvals/${id}/approve`, body);
}

/** 审批驳回（附理由）。 */
export function rejectSpecialApproval(
  id: string,
  body: { reason: string },
): Promise<SpecialApproval> {
  return post<SpecialApproval>(`/ams/special-approvals/${id}/reject`, body);
}

/* -------------------------------- 点评 --------------------------------- */

/** 创建并规则点评（围术期/门诊处方/住院医嘱）。 */
export function createReview(body: {
  reviewType: AmxReviewType;
  targetId?: string;
  visitId: string;
  [k: string]: unknown;
}): Promise<AmxReview> {
  return post<AmxReview>('/ams/reviews', body);
}

/** 点评列表（可按类型/结果/状态过滤）。 */
export function listReviews(params?: {
  reviewType?: AmxReviewType;
  result?: 'rational' | 'irrational';
  status?: string;
}): Promise<AmxReview[]> {
  return get<AmxReview[]>('/ams/reviews', {
    ...(params?.reviewType ? { reviewType: params.reviewType } : {}),
    ...(params?.result ? { result: params.result } : {}),
    ...(params?.status ? { status: params.status } : {}),
  });
}

/** 药师/医师签名确认点评结论（空对象/缺指征不能签合理）。 */
export function signReview(id: string, note?: string): Promise<AmxReview> {
  return post<AmxReview>(`/ams/reviews/${id}/sign`, { note: note ?? null });
}

/** 退回点评。 */
export function returnReview(id: string, reason: string): Promise<AmxReview> {
  return post<AmxReview>(`/ams/reviews/${id}/return`, { reason });
}

/* ------------------------------ 使用记录 -------------------------------- */

/** 记录一次抗菌药使用（自动算 DDDs）。 */
export function recordUsage(body: {
  visitId: string;
  drugId: string;
  purpose: 'prophylactic' | 'therapeutic';
  dose: number;
  doseUnit: string;
  frequency?: string;
  route?: string;
  usageDays?: number;
  totalAmount?: number;
  cultureSent?: boolean;
}): Promise<AmxUsageRecord> {
  return post<AmxUsageRecord>('/ams/usage', body);
}

/** 使用记录列表（可按 visitId 过滤）。 */
export function listUsage(params?: { visitId?: string }): Promise<AmxUsageRecord[]> {
  return get<AmxUsageRecord[]>('/ams/usage', {
    ...(params?.visitId ? { visitId: params.visitId } : {}),
  });
}

/* ------------------------------ 质控指标 -------------------------------- */

/** 八项抗菌药质控指标（应用层聚合，分子分母可核查）。 */
export function getAmsMetrics(from: string, to: string): Promise<AmxMetricsResponse> {
  return get<AmxMetricsResponse>(
    `/ams/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

/* --------------------------- 规则预检（不入库） -------------------------- */

/** CDS 规则预检：围术期或治疗性用药合理性，只返回建议，不入库。 */
export function checkRules(body: {
  kind: 'perioperative' | 'antibioticUse';
  [k: string]: unknown;
}): Promise<AmxCheckResult> {
  return post<AmxCheckResult>('/ams/check', body);
}
