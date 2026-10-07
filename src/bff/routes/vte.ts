/**
 * 健澜科技 jlmedaios - VTE 智能防治 BFF 路由（M13-A）
 *
 * 真实落 PostgreSQL，去 mock：风险评估、高危看板、质控指标、预防建议确认/执行、
 * 结局与不良事件。权限码 + 统一错误信封 + traceId。
 *
 * 医疗安全：药物预防须医师确认（vte:prevent）后才生成医嘱；AI 不自主开抗凝药。
 * 集合/静态路由在 :id 之前注册。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  VteError,
  assessVte,
  listAssessmentsView,
  getAssessmentView,
  getHighRiskBoard,
  getVisitDetail,
  createPreventionView,
  listPreventionsView,
  confirmPharmacological,
  executeMechanical,
  contraindicate,
  recordOutcomeView,
  listOutcomesView,
  getVteMetrics,
  extractFactors,
} from '../aggregators/vteAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof VteError) {
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
  const message = err instanceof Error ? err.message : 'VTE 防治处理失败';
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

export const vteRoutes: RouteDef[] = [
  // ---- 评估 ----
  {
    method: 'POST',
    path: '/api/v1/vte/assessments',
    handle: guarded('vte:assess', async (c, view) =>
      assessVte(view, await c.body<Parameters<typeof assessVte>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/vte/assessments',
    handle: guarded('vte:read', (c, view) =>
      listAssessmentsView(view, {
        visitId: c.query.get('visitId') ?? undefined,
        vteLevel: c.query.get('vteLevel') ?? undefined,
        occasion: c.query.get('occasion') ?? undefined,
      }),
    ),
    auth: true,
  },
  // ---- 高危看板（静态集合，须在 :id 之前）----
  {
    method: 'GET',
    path: '/api/v1/vte/high-risk',
    handle: guarded('vte:read', (c, view) => getHighRiskBoard(view)),
    auth: true,
  },
  // ---- 质控指标（须在 :id 之前）----
  {
    method: 'GET',
    path: '/api/v1/vte/metrics',
    handle: guarded('vte:audit', (c, view) =>
      getVteMetrics(view, { from: c.query.get('from') ?? '', to: c.query.get('to') ?? '' }),
    ),
    auth: true,
  },
  // ---- 单就诊全详情（须在 assessments/:id 之前，避免路径歧义）----
  {
    method: 'GET',
    path: '/api/v1/vte/visits/:visitId',
    handle: guarded('vte:read', (c, view) => getVisitDetail(view, c.params.visitId)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/vte/assessments/:id',
    handle: guarded('vte:read', (c, view) => getAssessmentView(view, c.params.id)),
    auth: true,
  },
  // ---- 预防措施 ----
  {
    method: 'POST',
    path: '/api/v1/vte/preventions',
    handle: guarded('vte:assess', async (c, view) =>
      createPreventionView(view, await c.body<Parameters<typeof createPreventionView>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/vte/preventions',
    handle: guarded('vte:read', (c, view) =>
      listPreventionsView(view, {
        visitId: c.query.get('visitId') ?? undefined,
        status: c.query.get('status') ?? undefined,
        category: c.query.get('category') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/vte/preventions/:id/confirm',
    handle: guarded('vte:prevent', async (c, view) =>
      confirmPharmacological(view, c.params.id, await c.body<Parameters<typeof confirmPharmacological>[2]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/vte/preventions/:id/execute',
    handle: guarded('vte:execute', (c, view) => executeMechanical(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/vte/preventions/:id/contraindicate',
    handle: guarded('vte:prevent', async (c, view) =>
      contraindicate(view, c.params.id, (await c.body<{ reason?: string }>()).reason ?? ''),
    ),
    auth: true,
  },
  // ---- 结局 ----
  {
    method: 'POST',
    path: '/api/v1/vte/outcomes',
    handle: guarded('vte:assess', async (c, view) =>
      recordOutcomeView(view, await c.body<Parameters<typeof recordOutcomeView>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/vte/outcomes',
    handle: guarded('vte:read', (c, view) =>
      listOutcomesView(view, {
        visitId: c.query.get('visitId') ?? undefined,
        eventType: c.query.get('eventType') ?? undefined,
      }),
    ),
    auth: true,
  },
  // ---- 可选 LLM 抽取（静态，须在 :id 之前）----
  {
    method: 'POST',
    path: '/api/v1/vte/extract-factors',
    handle: guarded('vte:assess', async (c, view) =>
      extractFactors(view, await c.body<Parameters<typeof extractFactors>[1]>()),
    ),
    auth: true,
  },
];
