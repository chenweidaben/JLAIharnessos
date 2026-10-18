/**
 * 健澜科技 jlmedaios - 病历归档自动检查 V14 路由（M527-C）
 *
 * GET  /api/v1/emr-archive-auto-check  （read，auth:true）返回归档检查基础数据
 * POST /api/v1/emr-archive-auto-check  （auth:true）归档前检查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildArchiveAutoCheck,
  buildArchiveAutoCheckReport,
  checkBeforeArchive,
  type ArchiveAutoCheckInputV14,
} from "../aggregators/emrArchiveAutoCheckV14Aggregator.js";

export const emrArchiveAutoCheckV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-archive-auto-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-auto-check:read");
      if (denied) return denied;
      const check = buildArchiveAutoCheck("REC045", "心内科");
      return json(ok(check));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-archive-auto-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-auto-check:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: ArchiveAutoCheckInputV14 = {
        hasDischargeSummary: Boolean(body?.hasDischargeSummary ?? false),
        hasSignature: Boolean(body?.hasSignature ?? false),
        hasPayment: Boolean(body?.hasPayment ?? false),
      };
      const result = checkBeforeArchive(input);
      const report = buildArchiveAutoCheckReport({
        canArchive: result.canArchive,
        missingCount: result.missingItems.length,
      });
      return json(ok({ input, result, report }));
    },
  },
];
