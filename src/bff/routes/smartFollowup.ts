/**
 * 健澜科技 jlmedaios — 患者随访智能化 BFF 路由（M152-D）
 *
 * GET  /api/v1/followup/auto-plan/:patientId  AI 生成随访计划 + 再入院风险预测
 * POST /api/v1/followup/send                 自动随访发送（患者授权 + 08:00–20:00）
 *
 * AI能力深化：疾病分型、30 天再入院风险分层、合规发送网关。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  generateFollowupPlan,
  predictRehospitalizationRisk,
  sendAutoFollowup,
  type FollowupChannel,
} from '../aggregators/smartFollowupAggregator';

function mapError(err: unknown): Response {
  if (err instanceof Error) {
    return json(fail(ErrorCode.BAD_REQUEST, err.message), 400);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, '随访服务异常'), 500);
}

export const smartFollowupRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/followup/auto-plan/:patientId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'follow_up:view');
      if (denied) return denied;
      try {
        const patientId = c.params.patientId || '';
        if (!patientId) return json(fail(ErrorCode.BAD_REQUEST, 'patientId 不能为空'), 400);
        const disease = c.query.get('disease') ?? '';
        const dischargeDate = c.query.get('dischargeDate') ?? new Date().toISOString();
        const plan = generateFollowupPlan(patientId, disease, dischargeDate);
        const risk = predictRehospitalizationRisk(patientId, disease);
        return json(ok({ plan, risk }));
      } catch (e) {
        return mapError(e);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/followup/send',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'follow_up:manage');
      if (denied) return denied;
      try {
        const body = (await c.body()) as {
          patientId?: string;
          channel?: FollowupChannel;
          template?: string;
        };
        const result = sendAutoFollowup(
          body.patientId ?? '',
          (body.channel ?? 'sms') as FollowupChannel,
          body.template ?? '',
        );
        const status = result.success ? 200 : 422;
        return json(ok(result), status);
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
