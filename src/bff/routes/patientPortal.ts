/**
 * 健澜科技 jlmedaios - 患者端门户路由（M80-A）
 * /api/v1/patient/portal
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { portalView, PatientPortalError } from '../aggregators/patientPortalAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  // demo 模式无 DB，直接用 JWT 中的身份信息构建视图
  if (process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true') {
    const rawRoles = c.user.roles ?? ['patient'];
    return {
      id: c.user.id,
      username: c.user.name ?? 'patient',
      realName: c.user.name ?? '测试患者',
      employeeNo: '',
      gender: 'unknown',
      deptCode: 'outpatient',
      deptName: '门诊',
      title: '',
      phone: '',
      email: '',
      status: 'active',
      roles: rawRoles.map((r) => ({ id: `role_${r}`, code: r, name: r, description: r, level: 'dept', dataScope: 'self', status: 'enabled', userCount: 0, permissionCount: 0, permissionCodes: [], createdAt: '', createdBy: 'system' })),
      roleCodes: rawRoles,
      rawRoles,
      permissions: c.user.permissions ?? [],
      dataScope: 'self',
    };
  }
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PatientPortalError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '门户聚合失败'), 500);
}

export const patientPortalRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/portal',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_portal:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await portalView(view))); } catch (e) { return mapError(e); }
    },
  },
];
