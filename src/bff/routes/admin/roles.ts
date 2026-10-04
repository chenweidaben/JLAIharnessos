/**
 * 健澜科技 jlmedaios - 角色与权限管理 BFF 路由（M8-B）
 *
 * 系统管理「角色管理」端点，写操作需要 role:manage 权限（仅 admin 拥有）；
 * 权限目录只读端点需要 system:perm:manage 权限。
 *  - GET    /api/v1/admin/roles                       角色列表
 *  - GET    /api/v1/admin/roles/:code                 角色详情（含关联用户）
 *  - GET    /api/v1/admin/permissions                 权限目录（按模块分组）
 *  - POST   /api/v1/admin/roles                       新建自定义角色
 *  - PUT    /api/v1/admin/roles/:code                 编辑角色名称/描述
 *  - PUT    /api/v1/admin/roles/:code/permissions     为角色分配权限
 *  - DELETE /api/v1/admin/roles/:code                 删除自定义角色
 *
 * 入参经 Zod 严格校验；业务错误（RoleAdminError）映射对应状态码，
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
import { RoleAdminError } from '../../../db/repositories/roleAdminRepo';
import {
  assignPermissions,
  createCustomRole,
  editCustomRole,
  getRoleDetail,
  queryPermissions,
  queryRoles,
  removeCustomRole,
} from '../../aggregators/roleAdminAggregator';

const codePattern = /^[a-z][a-z0-9_]{1,49}$/;

const createBody = z.object({
  code: z.string().regex(codePattern, '角色编码需为小写字母/数字/下划线，2-50 位'),
  name: z.string().min(1).max(50),
  description: z.string().nullable().optional(),
  permissionCodes: z.array(z.string()).optional(),
});

const updateBody = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().nullable().optional(),
});

const permissionsBody = z.object({
  permissionCodes: z.array(z.string()),
});

/** 从 Ctx 加载完整操作人视图 */
async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 业务错误 → 对应状态码；Zod → 400；其余 → 500 */
function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof RoleAdminError) {
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
  const message = err instanceof Error ? err.message : '角色管理操作失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
}

export const roleAdminRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/roles',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'role:manage');
      if (denied) return denied;
      return json(ok(await queryRoles()));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/roles/:code',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'role:manage');
      if (denied) return denied;
      try {
        return json(ok(await getRoleDetail(c.params.code)));
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/permissions',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'system:perm:manage');
      if (denied) return denied;
      return json(ok(await queryPermissions()));
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/roles',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'role:manage');
      if (denied) return denied;
      try {
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '操作人不存在', c.traceId), 401);
        const body = createBody.parse(await c.body());
        const role = await createCustomRole(view, body);
        return json(ok(role, '角色已创建'), 201);
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
  {
    method: 'PUT',
    path: '/api/v1/admin/roles/:code',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'role:manage');
      if (denied) return denied;
      try {
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '操作人不存在', c.traceId), 401);
        const body = updateBody.parse(await c.body());
        return json(ok(await editCustomRole(view, c.params.code, body), '角色已更新'));
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
  {
    method: 'PUT',
    path: '/api/v1/admin/roles/:code/permissions',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'role:manage');
      if (denied) return denied;
      try {
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '操作人不存在', c.traceId), 401);
        const body = permissionsBody.parse(await c.body());
        const role = await assignPermissions(view, c.params.code, body.permissionCodes);
        return json(ok(role, '权限已分配'));
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
  {
    method: 'DELETE',
    path: '/api/v1/admin/roles/:code',
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'role:manage');
      if (denied) return denied;
      try {
        const view = await requester(c);
        if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '操作人不存在', c.traceId), 401);
        return json(ok(await removeCustomRole(view, c.params.code), '角色已删除'));
      } catch (err) {
        return mapError(err, c);
      }
    },
    auth: true,
  },
];
