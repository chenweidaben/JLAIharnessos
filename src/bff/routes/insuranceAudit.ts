/**
 * 健澜科技 jlmedaios - 医保事前智能审核 BFF 路由
 *
 * POST /api/v1/insurance/audit（auth，登录即可）
 *   body: { visitId?, diagnoses?, items: AuditItem[] }
 *   返回：命中规则列表 + 整体风险等级（riskLevel / blocked / hits）。
 * 仅后端能力，无前端页面。统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  auditPrescription,
  SAMPLE_RULES,
  type Prescription,
} from '../aggregators/insuranceAuditAggregator';

export const insuranceAuditRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/insurance/audit',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: Prescription;
      try {
        body = await c.body<Prescription>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
      }
      if (!body || !Array.isArray(body.items) || body.items.length === 0) {
        return json(fail(ErrorCode.BAD_REQUEST, 'items 不能为空数组'), 400);
      }
      const result = auditPrescription(body, SAMPLE_RULES);
      return json(ok(result));
    },
  },
];
