/**
 * 健澜科技 jlmedaios - 病历归档完整性校验 V14 路由（M533-B）
 *
 * GET  /api/v1/emr-archive-integrity  （read，auth:true）返回完整性校验基础数据
 * POST /api/v1/emr-archive-integrity  （auth:true）完整性校验 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildArchiveIntegrity,
  buildArchiveIntegrityReport,
  verifyArchiveIntegrity,
  type ArchiveIntegrityInputV14,
} from "../aggregators/emrArchiveIntegrityV14Aggregator.js";

export const emrArchiveIntegrityV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-archive-integrity",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-integrity:read");
      if (denied) return denied;
      const integrity = buildArchiveIntegrity("REC091", "2026-10-01");
      return json(ok(integrity));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-archive-integrity",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-integrity:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: ArchiveIntegrityInputV14 = {
        expectedFields: Number(obj?.expectedFields ?? 0),
        actualFields: Number(obj?.actualFields ?? 0),
      };
      const result = verifyArchiveIntegrity(input);
      const report = buildArchiveIntegrityReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
