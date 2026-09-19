/**
 * 健澜科技数智医院智能体（jlmedaios） - BFF 权限管理路由
 *
 * 安全要点（等保三级 / 医疗合规）：
 *  - 全部端点 requireRole('admin')，未登录 401、非管理员 403；
 *  - 写操作（PUT/POST/DELETE）经 Zod 严格校验入参；
 *  - 服务层二次校验 SYSTEM_ADMIN，并落完整审计；
 *  - 禁止关闭已强制 MFA 的高风险操作（处方/医嘱/系统管理）。
 *
 * 本文件仅导出 permissionAdminRoutes（与 system.ts 范式一致），
 * 不自行注册到 server.ts，由装配方统一接线。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { z } from 'zod';

import { requireRole } from '../../middleware/auth';
import {
  type Ctx,
  ErrorCode,
  fail,
  json,
  ok,
  type RouteDef,
} from '../../types';
import {
  DataScope,
  PermissionAction,
  PermissionModule,
  PermissionDeniedError,
  RoleCode,
  SecurityError,
} from '../../../security/types';
import { adminPermissionService, type PermissionOperator } from '../../../security/auth/AdminPermissionService';

/* ------------------------------------------------------------------ */
/* Zod 入参校验（从既有枚举派生，避免字面量漂移）                        */
/* ------------------------------------------------------------------ */

const MODULE_VALUES = Object.values(PermissionModule) as unknown as [string, ...string[]];
const ACTION_VALUES = Object.values(PermissionAction) as unknown as [string, ...string[]];
const SCOPE_VALUES = Object.values(DataScope) as unknown as [string, ...string[]];
const ROLE_VALUES = Object.values(RoleCode) as unknown as [string, ...string[]];
const RISK_VALUES = ['low', 'medium', 'high', 'critical'] as const;

const updateEntryBody = z.object({
  module: z.enum(MODULE_VALUES),
  action: z.enum(ACTION_VALUES),
  allowedRoles: z.array(z.enum(ROLE_VALUES)).optional(),
  defaultScope: z.enum(SCOPE_VALUES).optional(),
  requireMfa: z.boolean().optional(),
  riskLevel: z.enum(RISK_VALUES).optional(),
  roleScopes: z.record(z.enum(ROLE_VALUES), z.enum(SCOPE_VALUES)).optional(),
});

const grantBody = z.object({
  role: z.enum(ROLE_VALUES),
  module: z.enum(MODULE_VALUES),
  action: z.enum(ACTION_VALUES),
  scope: z.enum(SCOPE_VALUES).optional(),
});

/* ------------------------------------------------------------------ */
/* 工具函数                                                              */
/* ------------------------------------------------------------------ */

/** 从 Ctx 构造审计操作人（requireRole 已保证 admin） */
function toOperator(c: Ctx): PermissionOperator {
  return {
    userId: c.user!.id,
    userName: c.user!.name,
    roles: c.user!.roles.includes('admin') ? [RoleCode.SYSTEM_ADMIN] : [],
  };
}

/** 统一错误 → 响应；不可识别错误返回 null 交由调用方 500 */
function toErrorResponse(e: unknown): Response | null {
  if (e instanceof PermissionDeniedError) {
    return json(fail(ErrorCode.FORBIDDEN, e.message), 403);
  }
  if (e instanceof z.ZodError) {
    const detail = e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return json(fail(ErrorCode.BAD_REQUEST, `参数校验失败: ${detail}`), 400);
  }
  if (e instanceof SecurityError) {
    return json(fail(ErrorCode.BAD_REQUEST, e.message), 400);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 路由定义                                                              */
/* ------------------------------------------------------------------ */

export const permissionAdminRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/permissions/matrix',
    handle: (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      return json(ok(adminPermissionService.listMatrix()));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/permissions/roles',
    handle: (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      return json(ok(adminPermissionService.listRoles()));
    },
    auth: true,
  },
  {
    method: 'PUT',
    path: '/api/v1/admin/permissions/entry',
    handle: async (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      try {
        const body = updateEntryBody.parse(await c.body());
        const detail = adminPermissionService.updateEntry(
          {
            module: body.module as PermissionModule,
            action: body.action as PermissionAction,
            allowedRoles: body.allowedRoles as RoleCode[] | undefined,
            defaultScope: body.defaultScope as DataScope | undefined,
            requireMfa: body.requireMfa,
            riskLevel: body.riskLevel,
            roleScopes: body.roleScopes as Partial<Record<RoleCode, DataScope>> | undefined,
          },
          toOperator(c),
        );
        return json(ok(detail, '权限条目已更新'));
      } catch (e) {
        return (
          toErrorResponse(e) ??
          json(fail(ErrorCode.INTERNAL_ERROR, '更新权限条目失败', c.traceId), 500)
        );
      }
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/permissions/grant',
    handle: async (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      try {
        const body = grantBody.parse(await c.body());
        const detail = adminPermissionService.grant(
          {
            role: body.role as RoleCode,
            module: body.module as PermissionModule,
            action: body.action as PermissionAction,
            scope: body.scope as DataScope | undefined,
          },
          toOperator(c),
        );
        return json(ok(detail, '授权成功'));
      } catch (e) {
        return (
          toErrorResponse(e) ??
          json(fail(ErrorCode.INTERNAL_ERROR, '授权失败', c.traceId), 500)
        );
      }
    },
    auth: true,
  },
  {
    // 撤销使用 query 传参（DELETE 语义，避免请求体兼容性问题）
    method: 'DELETE',
    path: '/api/v1/admin/permissions/grant',
    handle: (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      try {
        const role = c.query.get('role');
        const module = c.query.get('module');
        const action = c.query.get('action');
        if (!role || !module || !action) {
          return json(fail(ErrorCode.BAD_REQUEST, '缺少 role/module/action 参数'), 400);
        }
        const detail = adminPermissionService.revoke(
          role as RoleCode,
          module as PermissionModule,
          action as PermissionAction,
          toOperator(c),
        );
        return json(ok(detail, '撤销成功'));
      } catch (e) {
        return (
          toErrorResponse(e) ??
          json(fail(ErrorCode.INTERNAL_ERROR, '撤销失败', c.traceId), 500)
        );
      }
    },
    auth: true,
  },
];
