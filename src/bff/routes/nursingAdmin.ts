/**
 * 健澜科技 jlmedaios - 护理管理后台 BFF 路由（M16-B）
 *
 * 前缀 /api/v1/admin/*：
 *  - GET  /admin/schedules              排班看板（病区+排班，按 DataScope）；
 *  - GET  /admin/shift-defs             班次定义；
 *  - POST /admin/schedules/assign        排一个班（返回合规校验，不阻断）；
 *  - POST /admin/schedules/publish      发布某日排班（护士长确认，审计链）；
 *  - GET  /admin/leave                   休假查询；
 *  - POST /admin/leave                   登记休假；
 *  - GET  /admin/indicators              NQI 指标库；
 *  - GET  /admin/indicators/dashboard    指标仪表盘（自动计算+人工补全）；
 *  - POST /admin/indicators/values       人工录入指标值（须校验）。
 *
 * 医疗安全：排班辅助、护士长确认；未接入数据源标 pending，不编造数字；
 * 异常值人工核实后上报。统一信封 + traceId。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { NURSING_ADMIN_PERMISSIONS } from '../permissions';
import { CareError } from '../aggregators/inpatientCareAggregator.js';
import {
  assignShift,
  createLeave,
  enterIndicatorValue,
  getIndicatorDashboard,
  listIndicatorCatalog,
  listLeave,
  listScheduleBoard,
  listShiftOptions,
  publishSchedule,
} from '../aggregators/nursingAdminAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof CareError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 409 ? ErrorCode.CONFLICT
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '护理管理处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<unknown>,
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

export const nursingAdminRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/schedules',
    handle: guarded(NURSING_ADMIN_PERMISSIONS.SCHEDULE_VIEW, async (c, view) =>
      listScheduleBoard(view, { from: c.query.get('from') ?? undefined, to: c.query.get('to') ?? undefined }),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/shift-defs',
    handle: guarded(NURSING_ADMIN_PERMISSIONS.SCHEDULE_VIEW, async (c, view) =>
      listShiftOptions(view, c.query.get('wardId')),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/schedules/assign',
    handle: guarded(NURSING_ADMIN_PERMISSIONS.SCHEDULE, async (_c, view) =>
      assignShift(view, await _c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/schedules/publish',
    handle: guarded(NURSING_ADMIN_PERMISSIONS.SCHEDULE, async (_c, view) =>
      publishSchedule(view, await _c.body()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/leave',
    handle: guarded(NURSING_ADMIN_PERMISSIONS.SCHEDULE_VIEW, async (c, view) =>
      listLeave(view, { nurseId: c.query.get('nurseId') ?? undefined }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/leave',
    handle: guarded(NURSING_ADMIN_PERMISSIONS.SCHEDULE, async (_c, view) =>
      createLeave(view, await _c.body()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/indicators',
    handle: guarded(NURSING_ADMIN_PERMISSIONS.INDICATOR_VIEW, async (_c, view) =>
      listIndicatorCatalog(view),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/indicators/dashboard',
    handle: guarded(NURSING_ADMIN_PERMISSIONS.INDICATOR_VIEW, async (c, view) =>
      getIndicatorDashboard(view, {
        period: c.query.get('period') ?? '',
        wardId: c.query.get('wardId') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/indicators/values',
    handle: guarded(NURSING_ADMIN_PERMISSIONS.INDICATOR_ENTER, async (_c, view) =>
      enterIndicatorValue(view, await _c.body()),
    ),
    auth: true,
  },
];
