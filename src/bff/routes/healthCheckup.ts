/**
 * 健澜科技 jlmedaios - M142-A 健康体检管理 BFF 路由（预防保健与患者服务）
 *
 *   GET /api/v1/patient/checkup/:id   患者查看本人“看得懂”的通俗体检报告
 *   GET /api/v1/admin/checkup/list     体检中心管理端查看体检单列表
 *
 * 说明：仅暴露读接口；开单 / 录结果由 healthCheckupAggregator 的纯函数完成，
 *       生产落库走 clinical.health_checkup* 两张表。登录即可访问（auth:true），
 *       细粒度权限码 checkup:view / checkup:admin 见 279-health-checkup.sql 注释。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  CheckupError,
  generateCheckupReport,
  listCheckupOrdersView,
} from '../aggregators/healthCheckupAggregator';

function mapError(err: unknown): Response {
  if (err instanceof CheckupError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND : err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'checkup failed'), 500);
}

/** 需要登录（auth:true）后的读处理器包装 */
function authed(handler: (c: Ctx) => unknown | Promise<unknown>): (c: Ctx) => Promise<Response> {
  return async (c: Ctx): Promise<Response> => {
    if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期'), 401);
    try {
      return json(ok(await handler(c)));
    } catch (e) {
      return mapError(e);
    }
  };
}

export const healthCheckupRoutes: RouteDef[] = [
  {
    // 患者端：查看通俗版体检报告
    method: 'GET',
    path: '/api/v1/patient/checkup/:id',
    handle: authed((c) => generateCheckupReport(c.params.id)),
    auth: true,
  },
  {
    // 管理端：体检单列表
    method: 'GET',
    path: '/api/v1/admin/checkup/list',
    handle: authed(() => ({ total: listCheckupOrdersView().length, orders: listCheckupOrdersView() })),
    auth: true,
  },
];
