/**
 * 健澜科技 jlmedaios - 压疮/跌倒风险预警 BFF 路由（M17-A）
 *
 * 真实落 PostgreSQL：风险评估、高危看板、预防确认/执行(本人签名)、结局事件、NQI 指标。
 * 权限码 + 统一错误信封 + traceId。集合/静态路由在 :id 之前注册。
 *
 * 医疗安全：预防措施仅 suggested 草稿，护士 execute 时本人签名才落库；AI 不自主开医嘱。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  NursingRiskError,
  assessRisk,
  listAssessmentsView,
  getAssessmentView,
  getHighRiskBoard,
  getVisitDetail,
  listPreventionsView,
  acceptPreventionView,
  executePreventionView,
  cancelPreventionView,
  recordEventView,
  listEventsView,
  getRiskMetrics,
} from '../aggregators/nursingRiskAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof NursingRiskError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : err.status === 403
            ? ErrorCode.FORBIDDEN
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '护理风险预警处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<T>,
) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      return json(ok(data));
    } catch (err) {
      return mapError(err);
    }
  };
}

export const nursingRiskRoutes: RouteDef[] = [
  // ---- 评估登记 ----
  {
    method: 'POST',
    path: '/api/v1/nursing-risk/assessments',
    handle: guarded('nursing_risk:assess', async (c, view) =>
      assessRisk(view, await c.body<Parameters<typeof assessRisk>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/nursing-risk/assessments',
    handle: guarded('nursing_risk:read', (c, view) =>
      listAssessmentsView(view, {
        visitId: c.query.get('visitId') ?? undefined,
        riskType: c.query.get('riskType') ?? undefined,
        level: c.query.get('level') ?? undefined,
      }),
    ),
    auth: true,
  },
  // ---- 高危看板（静态集合，须在 :id 之前）----
  {
    method: 'GET',
    path: '/api/v1/nursing-risk/high-risk',
    handle: guarded('nursing_risk:read', (c, view) => getHighRiskBoard(view)),
    auth: true,
  },
  // ---- NQI 指标（须在 :id 之前）----
  {
    method: 'GET',
    path: '/api/v1/nursing-risk/metrics',
    handle: guarded('nursing_risk:read', (c, view) =>
      getRiskMetrics(view, { from: c.query.get('from') ?? '', to: c.query.get('to') ?? '' }),
    ),
    auth: true,
  },
  // ---- 单就诊全详情（须在 assessments/:id 之前）----
  {
    method: 'GET',
    path: '/api/v1/nursing-risk/visits/:visitId',
    handle: guarded('nursing_risk:read', (c, view) => getVisitDetail(view, c.params.visitId)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/nursing-risk/assessments/:id',
    handle: guarded('nursing_risk:read', (c, view) => getAssessmentView(view, c.params.id)),
    auth: true,
  },
  // ---- 预防措施 ----
  {
    method: 'GET',
    path: '/api/v1/nursing-risk/preventions',
    handle: guarded('nursing_risk:read', (c, view) =>
      listPreventionsView(view, {
        visitId: c.query.get('visitId') ?? undefined,
        assessmentId: c.query.get('assessmentId') ?? undefined,
        status: c.query.get('status') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/nursing-risk/preventions/:id/accept',
    handle: guarded('nursing_risk:execute', (c, view) => acceptPreventionView(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/nursing-risk/preventions/:id/execute',
    handle: guarded('nursing_risk:execute', async (c, view) =>
      executePreventionView(view, c.params.id, await c.body<{ signature?: string }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/nursing-risk/preventions/:id/cancel',
    handle: guarded('nursing_risk:execute', (c, view) => cancelPreventionView(view, c.params.id)),
    auth: true,
  },
  // ---- 结局事件 ----
  {
    method: 'POST',
    path: '/api/v1/nursing-risk/events',
    handle: guarded('nursing_risk:execute', async (c, view) =>
      recordEventView(view, await c.body<Parameters<typeof recordEventView>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/nursing-risk/events',
    handle: guarded('nursing_risk:read', (c, view) =>
      listEventsView(view, {
        visitId: c.query.get('visitId') ?? undefined,
        riskType: c.query.get('riskType') ?? undefined,
        eventType: c.query.get('eventType') ?? undefined,
      }),
    ),
    auth: true,
  },
];
