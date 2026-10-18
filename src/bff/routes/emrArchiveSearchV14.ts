/**
 * 健澜科技 jlmedaios - 病历归档检索 V14 路由（M533-D，M533 收官）
 *
 * GET  /api/v1/emr-archive-search  （read，auth:true）返回归档检索基础数据
 * POST /api/v1/emr-archive-search  （auth:true）归档检索 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildArchiveSearch,
  buildArchiveSearchReport,
  searchArchiveRecords,
  type ArchiveSearchInputV14,
  type ArchiveSearchRecordV14,
} from "../aggregators/emrArchiveSearchV14Aggregator.js";

export const emrArchiveSearchV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-archive-search",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-search:read");
      if (denied) return denied;
      const search = buildArchiveSearch("心内科", 2026);
      return json(ok(search));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-archive-search",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-search:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const records = (obj?.records ?? []) as ArchiveSearchRecordV14[];
      const input: ArchiveSearchInputV14 = {
        query: String(obj?.query ?? ""),
        records,
      };
      const result = searchArchiveRecords(input);
      const report = buildArchiveSearchReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
