/**
 * 健澜科技 jlmedaios - 预约随访 BFF 路由（M3-I）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  ApptError,
  submitAppointment,
  listAppointments,
  confirmAppointment,
  completeAppointment,
  cancelAppointment,
  createFollowUpPlan,
  listFollowUpPlans,
  recordFollowUpResult,
} from '../aggregators/apptAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ApptError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : err.status === 400
            ? ErrorCode.BAD_REQUEST
            : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '预约随访处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(permission: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, permission);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      return json(ok(await fn(c, view)));
    } catch (err) {
      return mapError(err);
    }
  };
}

export const apptRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/appt/requests',
    handle: guarded('appt:confirm', async (c, view) =>
      submitAppointment(view, await c.body<Parameters<typeof submitAppointment>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/appt/requests',
    handle: guarded('appt:view', () => listAppointments()),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/appt/confirm/:id',
    handle: guarded('appt:confirm', async (c, view) =>
      confirmAppointment(c.params.id, view, (await c.body<{ visitId?: string }>()).visitId),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/appt/complete/:id',
    handle: guarded('appt:confirm', async (c, view) =>
      completeAppointment(c.params.id, view, (await c.body<{ outcome?: 'completed' | 'absent' }>()).outcome ?? 'completed'),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/appt/cancel/:id',
    handle: guarded('appt:confirm', async (c, view) =>
      cancelAppointment(c.params.id, view, (await c.body<{ reason?: string }>()).reason ?? ''),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/appt/followup-plans',
    handle: guarded('appt:followup', async (c, view) =>
      createFollowUpPlan(view, await c.body<Parameters<typeof createFollowUpPlan>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/appt/followup-plans',
    handle: guarded('appt:view', () => listFollowUpPlans()),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/appt/followup-records/:planId',
    handle: guarded('appt:followup', async (c, view) =>
      recordFollowUpResult(c.params.planId, view, await c.body<{ outcome: string; note?: string }>()),
    ),
    auth: true,
  },
];
