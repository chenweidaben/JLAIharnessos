/**
 * 健澜科技 jlmedaios - 患者端住院费用路由（M50-A）
 * GET /api/v1/patient/billing?patientId=
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { PatientBillingError, patientBillingView } from '../aggregators/patientBillingAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PatientBillingError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '患者费用查询失败'), 500);
}

export const patientBillingRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/billing',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_billing:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      try {
        const patientId = c.query.get('patientId') ?? '';
        const data = await patientBillingView(view, patientId);
        return json(ok(data));
      } catch (err) {
        return mapError(err);
      }
    },
  },
];
