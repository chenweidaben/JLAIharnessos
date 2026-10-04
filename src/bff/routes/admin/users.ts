/**
 * 健澜科技 jlmedaios - 用户管理 BFF 路由（M8-A）
 *
 * 系统管理「用户管理」端点，全部需要 user:manage 权限（仅 admin 拥有）。
 *  - GET    /api/v1/admin/users           列表（分页、关键字、科室、状态）
 *  - GET    /api/v1/admin/users/:id       详情
 *  - POST   /api/v1/admin/users           新增
 *  - PUT    /api/v1/admin/users/:id       编辑
 *  - POST   /api/v1/admin/users/:id/status         启用/禁用/休假
 *  - POST   /api/v1/admin/users/:id/reset-password 重置密码
 *  - DELETE /api/v1/admin/users/:id       软删除（离职）
 *
 * 入参经 Zod 严格校验；业务错误（UserAdminError）映射对应状态码，
 * 不可识别错误返回 500 并带 traceId。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { z } from 'zod';

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../../view/userView';
import { requirePermissionCode } from '../../middleware/auth';
import {
  type Ctx,
  ErrorCode,
  fail,
  json,
  ok,
  type RouteDef,
} from '../../types';
import {
  type AdminUserStatus,
  UserAdminError,
} from '../../../db/repositories/adminUserRepo';
import {
  adminResetPassword,
  changeStatus,
  createAccount,
  editAccount,
  getUserDetail,
  queryUsers,
  removeAccount,
} from '../../aggregators/adminUserAggregator';

const STATUS_VALUES = ['active', 'disabled', 'locked', 'leave'] as const;
const SCOPE_VALUES = ['self', 'department', 'hospital', 'all'] as const;

const roleAssignmentSchema = z.object({
  roleCode: z.string().min(1),
  dataScope: z.enum(SCOPE_VALUES),
  scopeValue: z.string().nullable().optional(),
});

const createBody = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(8).max(128),
  realName: z.string().min(1).max(50),
  employeeNo: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  deptCode: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  roles: z.array(roleAssignmentSchema).min(1),
});

const updateBody = z.object({
  realName: z.string().min(1).max(50).optional(),
  employeeNo: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  deptCode: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  roles: z.array(roleAssignmentSchema).optional(),
});

const statusBody = z.object({ status: z.enum(STATUS_VALUES) });
const resetBody = z.object({ newPassword: z.string().min(8).max(128) });

/** 从 Ctx 加载完整操作人视图 */
async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 业务错误 → 对应状态码；Zod → 400；其余 → 500 */
function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof UserAdminError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message, c.traceId), err.status);
  }
  if (err instanceof z.ZodError) {
    const detail = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return json(fail(ErrorCode.BAD_REQUEST, `参数校验失败: ${detail}`, c.traceId), 400);
  }
  const message = err instanceof Error ? err.message : '用户管理操作失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
}

export const userAdminRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/users',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'user:manage');
      if (denied) return denied;
      const result = await queryUsers({
        keyword: c.query.get('keyword') ?? undefined,
        deptCode: c.query.get('deptCode') ?? undefined,
        status: (c.query.get('status') as AdminUserStatus) ?? undefined,
        limit: Number(c.query.get('limit') ?? 20),
        offset: Number(c.query.get('offset') ?? 0),
      });
      return json(ok(result));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/users/:id',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'user:manage');
      if (denied) return denied;
      try {
        return json(ok(await getUserDetail(c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/users',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'user:manage');
      if (denied) return denied;
      try {
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '操作人不存在', c.traceId), 401);
        const body = createBody.parse(await c.body());
        const user = await createAccount(view, body);
        return json(ok(user, '账户已创建'), 201);
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
  {
    method: 'PUT',
    path: '/api/v1/admin/users/:id',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'user:manage');
      if (denied) return denied;
      try {
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '操作人不存在', c.traceId), 401);
        const body = updateBody.parse(await c.body());
        return json(ok(await editAccount(view, c.params.id, body), '账户已更新'));
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/users/:id/status',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'user:manage');
      if (denied) return denied;
      try {
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '操作人不存在', c.traceId), 401);
        const body = statusBody.parse(await c.body());
        return json(ok(await changeStatus(view, c.params.id, body.status), '状态已更新'));
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/users/:id/reset-password',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'user:manage');
      if (denied) return denied;
      try {
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '操作人不存在', c.traceId), 401);
        const body = resetBody.parse(await c.body());
        return json(ok(await adminResetPassword(view, c.params.id, body.newPassword), '密码已重置，该用户已被强制下线'));
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
  {
    method: 'DELETE',
    path: '/api/v1/admin/users/:id',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'user:manage');
      if (denied) return denied;
      try {
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '操作人不存在', c.traceId), 401);
        return json(ok(await removeAccount(view, c.params.id), '账户已删除（离职）'));
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
];
