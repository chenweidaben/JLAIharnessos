/**
 * 健澜科技 jlmedaios - LIS 检验全流程 BFF 路由（M11-A）
 *
 * 真实落 PostgreSQL：检验申请 / 标本采集签收拒收 / 结果录入 / 报告提交审核退回发布。
 * 权限码 + 统一错误信封 + traceId。集合/静态路由先于 :id 动态路由注册。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  LisError,
  listPanelsView,
  listItemsView,
  createPanelCatalog,
  createItemCatalog,
  attachItemToPanel,
  createLabRequest,
  listLabRequestsView,
  getLabRequestDetail,
  cancelLabRequest,
  generateSpecimens,
  listSpecimensView,
  collectSpecimen,
  receiveSpecimen,
  rejectSpecimen,
  createLabReport,
  enterResults,
  submitReport,
  approveReport,
  returnReport,
  publishReport,
  listReportsView,
  getReportDetail,
} from '../aggregators/lisAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof LisError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : err.status === 403
            ? ErrorCode.FORBIDDEN
            : err.status === 401
              ? ErrorCode.UNAUTHORIZED
              : err.status === 400
                ? ErrorCode.BAD_REQUEST
                : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '检验流程处理失败';
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

export const lisRoutes: RouteDef[] = [
  // ---- 目录（集合路由先于 :id）----
  {
    method: 'GET',
    path: '/api/v1/lab/catalog/panels',
    handle: guarded('lab:read', () => listPanelsView()),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/lab/catalog/items',
    handle: guarded('lab:read', () => listItemsView()),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/catalog/panels',
    handle: guarded('lis:catalog', async (c, view) =>
      createPanelCatalog(view, await c.body<Parameters<typeof createPanelCatalog>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/catalog/items',
    handle: guarded('lis:catalog', async (c, view) =>
      createItemCatalog(view, await c.body<Parameters<typeof createItemCatalog>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/catalog/panels/:panelId/items',
    handle: guarded('lis:catalog', async (c, view) => {
      const body = await c.body<{ itemId: string }>();
      return attachItemToPanel(view, c.params.panelId, body.itemId);
    }),
    auth: true,
  },

  // ---- 申请 ----
  {
    method: 'POST',
    path: '/api/v1/lab/requests',
    handle: guarded('lis:request', async (c, view) =>
      createLabRequest(view, await c.body<Parameters<typeof createLabRequest>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/lab/requests',
    handle: guarded('lab:read', (c) =>
      listLabRequestsView({
        status: c.query.get('status') ?? undefined,
        patientId: c.query.get('patientId') ?? undefined,
        visitId: c.query.get('visitId') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/requests/:id/specimens',
    handle: guarded('lis:receive', (c, view) => generateSpecimens(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/requests/:id/reports',
    handle: guarded('lis:enter', async (c, view) =>
      createLabReport(view, c.params.id, await c.body<{ panelId: string }>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/lab/requests/:id',
    handle: guarded('lab:read', (c) => getLabRequestDetail(c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/requests/:id/cancel',
    handle: guarded('lis:request', async (c, view) =>
      cancelLabRequest(view, c.params.id, await c.body<{ reason: string }>()),
    ),
    auth: true,
  },

  // ---- 标本（集合路由先于 :id）----
  {
    method: 'GET',
    path: '/api/v1/lab/specimens',
    handle: guarded('lab:read', (c) =>
      listSpecimensView({
        status: c.query.get('status') ?? undefined,
        requestId: c.query.get('requestId') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/specimens/:id/collect',
    handle: guarded('lis:collect', async (c, view) =>
      collectSpecimen(view, c.params.id, await c.body<{ collectionSite?: string }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/specimens/:id/receive',
    handle: guarded('lis:receive', (c, view) => receiveSpecimen(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/specimens/:id/reject',
    handle: guarded('lis:receive', async (c, view) =>
      rejectSpecimen(view, c.params.id, await c.body<{ reason: string }>()),
    ),
    auth: true,
  },

  // ---- 报告/结果（集合路由先于 :id）----
  {
    method: 'GET',
    path: '/api/v1/lab/reports',
    handle: guarded('lab:read', (c) =>
      listReportsView({
        status: c.query.get('status') ?? undefined,
        patientId: c.query.get('patientId') ?? undefined,
        visitId: c.query.get('visitId') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/reports/:id/results',
    handle: guarded('lis:enter', async (c, view) =>
      enterResults(view, c.params.id, await c.body<Parameters<typeof enterResults>[2]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/reports/:id/submit',
    handle: guarded('lis:enter', (c, view) => submitReport(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/reports/:id/approve',
    handle: guarded('lis:review', (c, view) => approveReport(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/reports/:id/return',
    handle: guarded('lis:review', async (c, view) =>
      returnReport(view, c.params.id, await c.body<{ reason: string }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/lab/reports/:id/publish',
    handle: guarded('lis:publish', (c, view) => publishReport(view, c.params.id)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/lab/reports/:id',
    handle: guarded('lab:read', (c) => getReportDetail(c.params.id)),
    auth: true,
  },
];
