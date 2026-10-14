/**
 * 健澜科技 jlmedaios - 科研专病队列导出 BFF 路由
 *
 *  GET /api/v1/research/export  按纳排条件导出专病队列为 CSV（text/csv，UTF-8 BOM）。
 *
 * 安全：仅要求登录（auth:true），不新增权限码——导出走既有登录态即可，
 *       不触碰 WebSocket，不改动任何权限定义。CSV 由 aggregator 纯函数生成。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildCsv,
  listView,
  type CohortFilters,
} from '../aggregators/researchExportAggregator';

/** 统一 CSV 响应头（ASCII 文件名，避免 Content-Disposition 编码兼容问题） */
function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/** 从 query 解析纳排条件；数值字段非法时忽略该条件（不报错，宽松筛选）。 */
function parseFilters(c: Ctx): CohortFilters {
  const num = (key: string): number | undefined => {
    const raw = c.query.get(key);
    if (raw == null || raw === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    disease: c.query.get('disease') ?? undefined,
    gender: c.query.get('gender') ?? undefined,
    minAge: num('minAge'),
    maxAge: num('maxAge'),
    minLos: num('minLos'),
    department: c.query.get('department') ?? undefined,
  };
}

export const researchExportRoutes: RouteDef[] = [
  {
    // 纳排预览（JSON 信封）：与导出共用同一 listView，供前端表格展示命中队列。
    method: 'GET',
    path: '/api/v1/research/export/preview',
    handle: async (c: Ctx): Promise<Response> => {
      try {
        return json(ok(listView(parseFilters(c))));
      } catch (err) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '队列预览失败'),
          500,
        );
      }
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/research/export',
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const rows = listView(parseFilters(c));
        return csvResponse(buildCsv(rows), 'cohort-export.csv');
      } catch (err) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '队列导出失败'),
          500,
        );
      }
    },
    auth: true,
  },
];
