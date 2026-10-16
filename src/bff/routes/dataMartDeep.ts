/**
 * 健澜科技 jlmedaios - 医院数据中台深化 · 数据资产治理 BFF 路由（M164-A）
 *
 * 「数据中台与AI大脑」——数据中台要真治理，不是建表就完。
 *
 *   GET /api/v1/admin/data-mart/catalog         数据资产清单（表/字段/敏感级别/质量分）
 *   GET /api/v1/admin/data-mart/lineage?table=xxx[&column=yyy]
 *                                               数据血缘追踪（来源→加工→应用）
 *
 * 数据来源：aggregators/dataMartDeepAggregator.ts（纯函数派生，进程内目录）。
 * 权限：data_asset:catalog:read / data_asset:lineage:read（admin 自动放行）。
 * 不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDataAssetCatalog,
  DataMartDeepError,
  traceDataLineage,
} from '../aggregators/dataMartDeepAggregator';

function mapError(err: unknown, traceId: string): Response {
  if (err instanceof DataMartDeepError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 400
          ? ErrorCode.BAD_REQUEST
          : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message, traceId), err.status);
  }
  const message = err instanceof Error ? err.message : '数据资产治理处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message, traceId), 500);
}

export const dataMartDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/data-mart/catalog',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'data_asset:catalog:read');
      if (denied) return denied;
      try {
        return json(ok(buildDataAssetCatalog()));
      } catch (err) {
        return mapError(err, c.traceId);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/admin/data-mart/lineage',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'data_asset:lineage:read');
      if (denied) return denied;
      try {
        const table = c.query.get('table') ?? '';
        if (!table.trim()) {
          return json(fail(ErrorCode.BAD_REQUEST, '缺少必填参数 table', c.traceId), 400);
        }
        const column = c.query.get('column') ?? undefined;
        return json(ok(traceDataLineage(table.trim(), column?.trim() || undefined)));
      } catch (err) {
        return mapError(err, c.traceId);
      }
    },
  },
];
