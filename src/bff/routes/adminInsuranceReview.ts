/**
 * 健澜科技 jlmedaios - 医保结算智能审核 BFF 路由（M130-C，事后结算 · 建议级）
 *
 * POST /api/v1/admin/insurance/review（仅 admin / 医保办）
 *   body: { settlementId?, patientInfo?, items: SettlementItem[] }
 *   返回：费用测算（总金额 / 统筹基数 / 自费金额 / 自费占比）+ 建议项 issues。
 *
 * 【核心业务深化】本路由只做鉴权与数据装配，审核口径全部下沉到纯函数
 * reviewInsuranceSettlement。结果为「建议」，needManualConfirm 恒为 true，
 * 不阻断结算、不直接拒付，最终调整由医保办人工确认。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  reviewInsuranceSettlement,
  type PatientInfo,
  type SettlementItem,
} from '../aggregators/insuranceReviewAggregator';

interface ReviewRequestBody {
  settlementId?: string;
  patientInfo?: PatientInfo;
  items?: SettlementItem[];
}

/**
 * POST /api/v1/admin/insurance/review
 * 对一张已结算单据跑医保智能审核，输出费用测算与调整建议（人工确认）。
 */
async function handleReview(c: Ctx): Promise<Response> {
  // 仅 admin / 医保办角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  let body: ReviewRequestBody;
  try {
    body = await c.body<ReviewRequestBody>();
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
  }
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return json(fail(ErrorCode.BAD_REQUEST, 'items 不能为空数组'), 400);
  }

  try {
    const result = reviewInsuranceSettlement(
      body.items,
      body.patientInfo ?? null,
      body.settlementId,
    );
    return json(ok(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : '医保结算审核失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const adminInsuranceReviewRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/admin/insurance/review',
    auth: true,
    handle: handleReview,
  },
];
