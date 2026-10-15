/**
 * 健澜科技 jlmedaios - AI 合理用药深度审核 BFF 路由（M144-C）「AI核心能力深化」
 *
 * POST /api/v1/ai/drug-review        对一张处方执行五维深度审核（纯函数计算，即时返回）；
 * GET  /api/v1/ai/drug-review/stats  按 period 返回误拦率与五维分布统计。
 * 鉴权 + 统一错误信封；审核结论由纯函数产出，不落敏感明文，不自动拦截处方。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildFalsePositiveFeedback,
  deepDrugReview,
  getDrugReviewStats,
  type MedInput,
} from '../aggregators/aiDrugReviewAggregator.js';

/** POST /api/v1/ai/drug-review 请求体 */
interface DrugReviewBody {
  prescriptionId?: string;
  patientAge?: number | null;
  patientGender?: string | null;
  allergies?: string[];
  diseases?: string[];
  currentMeds?: MedInput[];
  /** 可选：药师误拦反馈（带 findingId 时一并留痕） */
  falsePositive?: { findingId: string; reason?: string } | null;
}

function badRequest(message: string): Response {
  return json(fail(ErrorCode.BAD_REQUEST, message), 400);
}

export const aiDrugReviewRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai/drug-review',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      let body: DrugReviewBody;
      try {
        body = await c.body<DrugReviewBody>();
      } catch {
        return badRequest('请求体不是合法 JSON');
      }
      if (!body || typeof body !== 'object') return badRequest('请求体为空');

      const review = deepDrugReview(
        body.prescriptionId,
        body.patientAge ?? null,
        body.patientGender ?? null,
        Array.isArray(body.allergies) ? body.allergies : [],
        Array.isArray(body.diseases) ? body.diseases : [],
        Array.isArray(body.currentMeds) ? body.currentMeds : [],
      );

      // 误拦反馈留痕：若药师在本次请求中标记某条告警误拦，构造反馈记录随响应回传
      const feedback = body.falsePositive && body.falsePositive.findingId
        ? buildFalsePositiveFeedback(
            review.prescriptionId,
            body.falsePositive.findingId,
            body.falsePositive.reason,
            c.user.name ?? '药师',
          )
        : null;

      return json(ok({ review, feedback }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/ai/drug-review/stats',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      // 纯函数统计：records 由落库层注入；当前返回该 period 的空基线（误拦率 0）
      const stats = getDrugReviewStats(c.query.get('period') ?? 'all', []);
      return json(ok(stats));
    },
  },
];
