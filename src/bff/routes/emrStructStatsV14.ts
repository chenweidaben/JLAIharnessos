/**
 * 健澜科技 jlmedaios - 病历结构化数据统计 V14 路由（M532-C）
 *
 * GET  /api/v1/emr-struct-stats  （read，auth:true）返回统计基础数据
 * POST /api/v1/emr-struct-stats  （auth:true）结构化统计 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildStructStats,
  buildStructStatsReport,
  computeStructStats,
  type StructStatsInputV14,
} from "../aggregators/emrStructStatsV14Aggregator.js";

export const emrStructStatsV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-struct-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-struct-stats:read");
      if (denied) return denied;
      const stats = buildStructStats("心内科", "2026-Q3");
      return json(ok(stats));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-struct-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-struct-stats:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: StructStatsInputV14 = {
        totalRecords: Number(obj?.totalRecords ?? 0),
        structuredRecords: Number(obj?.structuredRecords ?? 0),
      };
      const result = computeStructStats(input);
      const report = buildStructStatsReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
