/**
 * 健澜科技 jlmedaios - 医院数据中台 · 数据集市 BFF 路由（M150-C）
 *
 * 面向管理端的数据中台页（web/src/pages/admin/dataMart/List）：
 *   GET  /api/v1/admin/data-mart                 列出全部数据集市（元数据卡片）
 *   GET  /api/v1/admin/data-mart/:name           单个集市详情 + 数据预览
 *   POST /api/v1/admin/data-mart/:name/refresh   手动刷新集市（重算 row_count、更新 last_refreshed）
 *
 * 数据来源：aggregators/dataMartAggregator.ts（进程内集市目录，纯函数派生）。
 * 「能刷新、不是静态数据」：每次 POST refresh 都会让 row_count 变化、last_refreshed 更新。
 *
 * 权限：只读 data_warehouse:read；刷新 data_warehouse:admin（admin 角色自动放行）。
 * 不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  DataMartError,
  getDataMartDetail,
  listDataMarts,
  refreshDataMart,
  seedDataMarts,
} from '../aggregators/dataMartAggregator';

// 模块加载即内置六个标准集市（幂等，持续优化：后续改从 dws.data_mart 启动加载）
seedDataMarts();

function mapError(err: unknown, traceId: string): Response {
  if (err instanceof DataMartError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 400
          ? ErrorCode.BAD_REQUEST
          : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message, traceId), err.status);
  }
  const message = err instanceof Error ? err.message : '数据中台处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message, traceId), 500);
}

export const dataMartRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/data-mart',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'data_warehouse:read');
      if (denied) return denied;
      try {
        return json(ok({ marts: listDataMarts(), total: listDataMarts().length }));
      } catch (err) {
        return mapError(err, c.traceId);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/admin/data-mart/:name',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'data_warehouse:read');
      if (denied) return denied;
      try {
        const detail = getDataMartDetail(c.params.name);
        if (!detail) {
          return json(fail(ErrorCode.NOT_FOUND, `数据集市不存在：${c.params.name}`, c.traceId), 404);
        }
        return json(ok(detail));
      } catch (err) {
        return mapError(err, c.traceId);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/data-mart/:name/refresh',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'data_warehouse:admin');
      if (denied) return denied;
      try {
        const result = refreshDataMart(c.params.name);
        const detail = getDataMartDetail(c.params.name);
        return json(ok({ refresh: result, mart: detail }));
      } catch (err) {
        return mapError(err, c.traceId);
      }
    },
  },
];
