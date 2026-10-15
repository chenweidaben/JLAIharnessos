/**
 * 健澜科技 jlmedaios - 患者端慢病视图 BFF 路由（M39-B）
 * /api/v1/patient/chronic。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { myChronicView, myChronicOverview, PatientChronicError } from '../aggregators/patientChronicAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}
function mapError(err: unknown): Response {
  if (err instanceof PatientChronicError) {
    return json(fail(ErrorCode.FORBIDDEN, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'patient chronic failed'), 500);
}
function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, 'patient_chronic:view');
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

export const patientChronicRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/chronic',
    handle: guarded((_c, view) => myChronicView(view)),
    auth: true,
  },
  {
    // M131-B 慢病管理助手：指标趋势 + 目标值对比概览（AI能力深化）
    method: 'GET',
    path: '/api/v1/patient/chronic/overview',
    handle: guarded((_c, view) => myChronicOverview(view)),
    auth: true,
  },
];
