/**
 * 健澜科技 jlmedaios - 病历归档索引 V14 路由（M533-C）
 *
 * GET  /api/v1/emr-archive-index  （read，auth:true）返回归档索引基础数据
 * POST /api/v1/emr-archive-index  （auth:true）索引条目构建 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildArchiveIndex,
  buildArchiveIndexEntry,
  buildArchiveIndexReport,
  type ArchiveIndexEntryInputV14,
} from "../aggregators/emrArchiveIndexV14Aggregator.js";

export const emrArchiveIndexV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-archive-index",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-index:read");
      if (denied) return denied;
      const index = buildArchiveIndex("心内科", 2026);
      return json(ok(index));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-archive-index",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-index:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: ArchiveIndexEntryInputV14 = {
        recordId: String(obj?.recordId ?? ""),
        patientName: String(obj?.patientName ?? ""),
        archiveDate: String(obj?.archiveDate ?? ""),
      };
      const result = buildArchiveIndexEntry(input);
      const report = buildArchiveIndexReport({ entryCount: 1 });
      return json(ok({ input, result, report }));
    },
  },
];
