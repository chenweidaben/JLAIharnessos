/**
 * 健澜科技数智医院智能体（jlmedaios）— BFF 租户/院区管理路由
 *
 * 安全要点（等保三级 / 医疗合规）：
 *  - 全部端点 requireRole('admin')，未登录 401、非管理员 403；
 *  - 写操作（POST/PUT/DELETE）经 Zod 严格校验入参；
 *  - 默认医院租户受保护（不可停用/不可删除），防止锁死系统；
 *  - 软删除级联到院区；停用租户立即不可被解析访问；
 *  - 本文件仅导出 tenantAdminRoutes，不自行注册到 server.ts，由装配方统一接线。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

import { requireRole } from '../../../bff/middleware/auth';
import {
  type Ctx,
  ErrorCode,
  fail,
  json,
  ok,
  type RouteDef,
} from '../../../bff/types';
import { MedicalAgentError } from '../../../core/errors';
import {
  createTenantSchema,
  mergeTenantConfigSchema,
  setTenantStatusSchema,
  tenantService,
} from '../../../tenant';

/* ------------------------------------------------------------------ */
/* 工具函数                                                              */
/* ------------------------------------------------------------------ */

/** 统一错误 → 响应；不可识别错误返回 null 交由调用方 500 */
function toErrorResponse(e: unknown): Response | null {
  if (e instanceof MedicalAgentError) {
    // 业务校验类错误（不存在/停用/层级错误）→ 400；越权类 → 403
    const code = e.code;
    if (code === 'PERMISSION_DENIED') {
      return json(fail(ErrorCode.FORBIDDEN, e.message), 403);
    }
    return json(fail(ErrorCode.BAD_REQUEST, e.message), 400);
  }
  if (e instanceof z.ZodError) {
    const detail = e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return json(fail(ErrorCode.BAD_REQUEST, `参数校验失败: ${detail}`), 400);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 路由定义                                                              */
/* ------------------------------------------------------------------ */

export const tenantAdminRoutes: RouteDef[] = [
  {
    // 租户/院区树（医院 → 院区）
    method: 'GET',
    path: '/api/v1/admin/tenants/tree',
    handle: (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      return json(
        ok({
          defaultTenantId: tenantService.getDefaultTenantId(),
          defaultCampusId: tenantService.getDefaultCampusId(),
          tree: tenantService.tree(),
        }),
      );
    },
    auth: true,
  },
  {
    // 创建医院或院区
    method: 'POST',
    path: '/api/v1/admin/tenants',
    handle: async (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      try {
        const body = createTenantSchema.parse(await c.body());
        let node;
        if (body.level === 'hospital') {
          node = tenantService.createHospital(body.name, body.config ?? {});
        } else {
          if (!body.parentId) {
            return json(fail(ErrorCode.BAD_REQUEST, '创建院区必须提供 parentId（上级医院 id）'), 400);
          }
          node = tenantService.createCampus(body.parentId, body.name, body.config ?? {});
        }
        return json(ok(node, '租户已创建'));
      } catch (e) {
        return (
          toErrorResponse(e) ??
          json(fail(ErrorCode.INTERNAL_ERROR, '创建租户失败', c.traceId), 500)
        );
      }
    },
    auth: true,
  },
  {
    // 启停
    method: 'PUT',
    path: '/api/v1/admin/tenants/:id/status',
    handle: async (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      try {
        const id = c.params.id;
        const body = setTenantStatusSchema.parse(await c.body());
        const node = tenantService.setEnabled(id, body.enabled);
        return json(ok(node, body.enabled ? '租户已启用' : '租户已停用'));
      } catch (e) {
        return (
          toErrorResponse(e) ??
          json(fail(ErrorCode.INTERNAL_ERROR, '更新租户状态失败', c.traceId), 500)
        );
      }
    },
    auth: true,
  },
  {
    // 合并租户级配置
    method: 'PUT',
    path: '/api/v1/admin/tenants/:id/config',
    handle: async (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      try {
        const id = c.params.id;
        const body = mergeTenantConfigSchema.parse(await c.body());
        const node = tenantService.mergeConfig(id, body.config);
        return json(ok(node, '租户配置已更新'));
      } catch (e) {
        return (
          toErrorResponse(e) ??
          json(fail(ErrorCode.INTERNAL_ERROR, '更新租户配置失败', c.traceId), 500)
        );
      }
    },
    auth: true,
  },
  {
    // 软删除（级联院区）
    method: 'DELETE',
    path: '/api/v1/admin/tenants/:id',
    handle: (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      try {
        const id = c.params.id;
        const node = tenantService.softDelete(id);
        return json(ok(node, '租户已删除'));
      } catch (e) {
        return (
          toErrorResponse(e) ??
          json(fail(ErrorCode.INTERNAL_ERROR, '删除租户失败', c.traceId), 500)
        );
      }
    },
    auth: true,
  },
];
