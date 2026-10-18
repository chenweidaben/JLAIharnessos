/**
 * 健澜科技 jlmedaios - 病历结构化数据导出 V14 路由（M532-B）
 *
 * GET  /api/v1/emr-struct-export  （read，auth:true）返回导出基础数据
 * POST /api/v1/emr-struct-export  （auth:true）导出结构化数据 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildStructExport,
  buildStructExportReport,
  exportStructData,
  type StructExportInputV14,
} from "../aggregators/emrStructExportV14Aggregator.js";

export const emrStructExportV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-struct-export",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-struct-export:read");
      if (denied) return denied;
      const exp = buildStructExport("入院记录", "CSV");
      return json(ok(exp));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-struct-export",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-struct-export:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: StructExportInputV14 = {
        recordCount: Number(obj?.recordCount ?? 0),
        format: (obj?.format ?? "JSON") as StructExportInputV14["format"],
      };
      const result = exportStructData(input);
      const report = buildStructExportReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
