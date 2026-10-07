/**
 * 健澜科技 jlmedaios - RIS 检查全流程 BFF 路由（M11-B）
 *
 * 真实落 PostgreSQL：检查申请 / 预约到检 / 执行生成 study / 报告草稿-AI辅助-提交-审核-退回-发布。
 * 查询统一用 imaging:read，写操作按 ris:* 权限。统一错误信封 + traceId。
 * 集合/静态路由先于 :id 动态路由注册。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  RisError,
  listExamsView,
  listDevicesView,
  listSlotsView,
  createExamCatalog,
  createDeviceCatalog,
  createSlotCatalog,
  createImagingRequest,
  listImagingRequestsView,
  getImagingRequestDetail,
  cancelImagingRequest,
  bookAppointment,
  listAppointmentsView,
  checkinAppointment,
  cancelAppointment,
  performExam,
  listStudiesView,
  addStudyImages,
  createDraftReport,
  saveReportDraft,
  aiAssistReport,
  submitImagingReport,
  approveImagingReport,
  returnImagingReport,
  publishImagingReport,
  listImagingReportsView,
  getImagingReportDetail,
} from '../aggregators/risAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof RisError) {
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
  const message = err instanceof Error ? err.message : '检查流程处理失败';
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

export const risRoutes: RouteDef[] = [
  // ---- 目录（集合路由先于 :id）----
  {
    method: 'GET',
    path: '/api/v1/ris/catalog/exams',
    handle: guarded('imaging:read', () => listExamsView()),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/ris/catalog/devices',
    handle: guarded('imaging:read', () => listDevicesView()),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/catalog/exams',
    handle: guarded('ris:catalog', async (c, view) =>
      createExamCatalog(view, await c.body<Parameters<typeof createExamCatalog>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/catalog/devices',
    handle: guarded('ris:catalog', async (c, view) =>
      createDeviceCatalog(view, await c.body<Parameters<typeof createDeviceCatalog>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/catalog/slots',
    handle: guarded('ris:catalog', async (c, view) =>
      createSlotCatalog(view, await c.body<Parameters<typeof createSlotCatalog>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/ris/catalog/slots',
    handle: guarded('imaging:read', (c) =>
      listSlotsView({
        deviceId: c.query.get('deviceId') ?? undefined,
        date: c.query.get('date') ?? undefined,
      }),
    ),
    auth: true,
  },

  // ---- 申请 ----
  {
    method: 'POST',
    path: '/api/v1/ris/requests',
    handle: guarded('ris:request', async (c, view) =>
      createImagingRequest(view, await c.body<Parameters<typeof createImagingRequest>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/ris/requests',
    handle: guarded('imaging:read', (c) =>
      listImagingRequestsView({
        status: c.query.get('status') ?? undefined,
        patientId: c.query.get('patientId') ?? undefined,
        visitId: c.query.get('visitId') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/ris/requests/:id',
    handle: guarded('imaging:read', (c) => getImagingRequestDetail(c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/requests/:id/cancel',
    handle: guarded('ris:request', async (c, view) =>
      cancelImagingRequest(view, c.params.id, await c.body<{ reason: string }>()),
    ),
    auth: true,
  },

  // ---- 预约 ----
  {
    method: 'POST',
    path: '/api/v1/ris/appointments',
    handle: guarded('ris:schedule', async (c, view) =>
      bookAppointment(view, await c.body<Parameters<typeof bookAppointment>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/ris/appointments',
    handle: guarded('imaging:read', (c) =>
      listAppointmentsView({
        status: c.query.get('status') ?? undefined,
        requestId: c.query.get('requestId') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/appointments/:id/checkin',
    handle: guarded('ris:schedule', (c, view) => checkinAppointment(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/appointments/:id/cancel',
    handle: guarded('ris:schedule', (c, view) => cancelAppointment(view, c.params.id)),
    auth: true,
  },

  // ---- 检查执行 ----
  {
    method: 'POST',
    path: '/api/v1/ris/appointments/:id/perform',
    handle: guarded('ris:perform', async (c, view) =>
      performExam(view, c.params.id, await c.body<{ studyUid?: string }>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/ris/studies',
    handle: guarded('imaging:read', (c) =>
      listStudiesView({ requestId: c.query.get('requestId') ?? undefined }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/studies/:id/images',
    handle: guarded('ris:perform', async (c, view) =>
      addStudyImages(view, c.params.id, await c.body<{ imageRefs: string[] }>()),
    ),
    auth: true,
  },

  // ---- 报告（集合路由先于 :id）----
  {
    method: 'POST',
    path: '/api/v1/ris/studies/:id/report',
    handle: guarded('ris:report', async (c, view) =>
      createDraftReport(view, c.params.id, await c.body<{ reportNo: string }>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/ris/reports',
    handle: guarded('imaging:read', (c) =>
      listImagingReportsView({
        status: c.query.get('status') ?? undefined,
        patientId: c.query.get('patientId') ?? undefined,
        visitId: c.query.get('visitId') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/reports/:id/draft',
    handle: guarded('ris:report', async (c, view) =>
      saveReportDraft(view, c.params.id, await c.body<{ findings?: string | null; impression?: string | null }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/reports/:id/ai-assist',
    handle: guarded('ris:report', (c, view) => aiAssistReport(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/reports/:id/submit',
    handle: guarded('ris:report', (c, view) => submitImagingReport(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/reports/:id/approve',
    handle: guarded('ris:review', (c, view) => approveImagingReport(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/reports/:id/return',
    handle: guarded('ris:review', async (c, view) =>
      returnImagingReport(view, c.params.id, await c.body<{ reason: string }>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ris/reports/:id/publish',
    handle: guarded('ris:publish', (c, view) => publishImagingReport(view, c.params.id)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/ris/reports/:id',
    handle: guarded('imaging:read', (c) => getImagingReportDetail(c.params.id)),
    auth: true,
  },
];
