/**
 * 健澜科技 jlmedaios - 抗菌药物管理 BFF 路由（M14-A）
 *
 * 真实落 PostgreSQL，去 mock：分级目录、处方授权、特殊使用级会诊审批、围术期/处方/
 * 医嘱专项点评、使用记录与质控指标。权限码 + 统一错误信封 + traceId。
 *
 * 医疗安全：AI 不自主开抗菌药；特殊使用级须 ams:approve 审批签名后才生成医嘱；
 * 越权/禁忌拦截；最终判定由药师/医师签名。
 * 集合/静态路由在 :id 之前注册。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  AmsError,
  listCatalogView,
  listGrantsView,
  upsertGrantView,
  applySpecialApproval,
  listSpecialApprovalsView,
  approveSpecialView,
  rejectSpecialView,
  consumeAntibiotic,
  listUsageView,
  createReviewView,
  listReviewsView,
  signReviewView,
  returnReviewView,
  checkRulesView,
  getAmsMetrics,
} from '../aggregators/amsAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof AmsError) {
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
  const message = err instanceof Error ? err.message : '抗菌药物管理处理失败';
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

export const amsRoutes: RouteDef[] = [
  // ---- 分级目录（集合，先于 :id）----
  {
    method: 'GET',
    path: '/api/v1/ams/catalog',
    handle: guarded('ams:read', (c, view) =>
      listCatalogView(view, { atcLevel: c.query.get('atcLevel') ?? undefined }),
    ),
    auth: true,
  },
  // ---- 质控指标（集合，先于 :id）----
  {
    method: 'GET',
    path: '/api/v1/ams/metrics',
    handle: guarded('ams:audit', (c, view) =>
      getAmsMetrics(view, { from: c.query.get('from') ?? '', to: c.query.get('to') ?? '' }),
    ),
    auth: true,
  },
  // ---- 处方授权 ----
  {
    method: 'GET',
    path: '/api/v1/ams/grants',
    handle: guarded('ams:read', (c, view) => listGrantsView(view)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ams/grants',
    handle: guarded('ams:audit', async (c, view) =>
      upsertGrantView(view, await c.body<Parameters<typeof upsertGrantView>[1]>()),
    ),
    auth: true,
  },
  // ---- 专项点评 ----
  {
    method: 'GET',
    path: '/api/v1/ams/reviews',
    handle: guarded('ams:read', (c, view) =>
      listReviewsView(view, {
        reviewType: c.query.get('reviewType') ?? undefined,
        status: c.query.get('status') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ams/reviews',
    handle: guarded('ams:review', async (c, view) =>
      createReviewView(view, await c.body<Parameters<typeof createReviewView>[1]>()),
    ),
    auth: true,
  },
  // ---- 特殊使用级申请（集合，先于 :id 动作）----
  {
    method: 'GET',
    path: '/api/v1/ams/special-approvals',
    handle: guarded('ams:read', (c, view) =>
      listSpecialApprovalsView(view, { status: c.query.get('status') ?? undefined }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ams/special-approvals',
    handle: guarded('ams:prescribe', async (c, view) =>
      applySpecialApproval(view, await c.body<Parameters<typeof applySpecialApproval>[1]>()),
    ),
    auth: true,
  },
  // ---- CDS 规则预检（不入库，集合）----
  {
    method: 'POST',
    path: '/api/v1/ams/check',
    handle: guarded('ams:read', async (c, view) =>
      checkRulesView(view, await c.body<Parameters<typeof checkRulesView>[1]>()),
    ),
    auth: true,
  },
  // ---- 使用记录（开方/给药留痕，含越权/未审批拦截）----
  {
    method: 'POST',
    path: '/api/v1/ams/usage',
    handle: guarded('ams:prescribe', async (c, view) =>
      consumeAntibiotic(view, await c.body<Parameters<typeof consumeAntibiotic>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/ams/usage',
    handle: guarded('ams:read', (c, view) =>
      listUsageView(view, { visitId: c.query.get('visitId') ?? undefined }),
    ),
    auth: true,
  },
  // ---- 特殊使用级审批动作 ----
  {
    method: 'POST',
    path: '/api/v1/ams/special-approvals/:id/approve',
    handle: guarded('ams:approve', async (c, view) =>
      approveSpecialView(view, c.params.id, await c.body<Parameters<typeof approveSpecialView>[2]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ams/special-approvals/:id/reject',
    handle: guarded('ams:approve', async (c, view) =>
      rejectSpecialView(view, c.params.id, (await c.body<{ reason?: string }>()).reason ?? ''),
    ),
    auth: true,
  },
  // ---- 点评签名/退回 ----
  {
    method: 'POST',
    path: '/api/v1/ams/reviews/:id/sign',
    handle: guarded('ams:review', async (c, view) =>
      signReviewView(view, c.params.id, (await c.body<{ note?: string }>()).note ?? ''),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ams/reviews/:id/return',
    handle: guarded('ams:review', async (c, view) =>
      returnReviewView(view, c.params.id, (await c.body<{ note?: string }>()).note ?? ''),
    ),
    auth: true,
  },
];
