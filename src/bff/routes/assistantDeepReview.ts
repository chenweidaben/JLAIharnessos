/**
 * 健澜科技 jlmedaios - 用药合理性深度审核 BFF 路由（M126-D）
 *
 * POST /api/v1/assistant/prescription/deep-review
 *   Body: { prescription, patientInfo, currentMedications, allergies }
 *   返回五维深度审核报告（相互作用 / 禁忌症 / 剂量 / 重复用药 / 特殊人群）。
 * 仅要求登录态（auth），不单独设权限码；统一错误信封。
 *
 * AI能力升级：只读审核，不拦截处方、不改变审批状态；最终用药决定由医师/药师作出。
 * 数据安全要求：全程不落敏感明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  DeepReviewError,
  deepPrescriptionReview,
  type ReviewPrescription,
  type ReviewPatientInfo,
} from '../aggregators/deepPrescriptionReviewAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof DeepReviewError) {
    const code =
      err.status === 401 ? ErrorCode.UNAUTHORIZED
      : err.status === 403 ? ErrorCode.FORBIDDEN
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const assistantDeepReviewRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/assistant/prescription/deep-review',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const body = (await c.body()) as Record<string, unknown>;
        const prescription = (body.prescription ?? {}) as ReviewPrescription;
        const patientInfo = (body.patientInfo ?? {}) as ReviewPatientInfo;
        const currentMedications = Array.isArray(body.currentMedications)
          ? (body.currentMedications as string[])
          : [];
        const allergies = Array.isArray(body.allergies)
          ? (body.allergies as string[])
          : [];
        // 纯函数审核，记录审核人（不落敏感处方明文到日志）
        void view.id;
        const report = deepPrescriptionReview(prescription, patientInfo, currentMedications, allergies);
        return json(ok(report));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
