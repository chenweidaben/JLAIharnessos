/**
 * 健澜科技 jlmedaios - 病历自动归档检查 V14 路由（M533-A）
 *
 * GET  /api/v1/emr-archive-check  （read，auth:true）返回归档检查基础数据
 * POST /api/v1/emr-archive-check  （auth:true）归档就绪检查 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildArchiveCheck,
  buildArchiveCheckReport,
  checkArchiveReadiness,
  type ArchiveCheckInputV14,
} from "../aggregators/emrArchiveCheckV14Aggregator.js";

export const emrArchiveCheckV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-archive-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-check:read");
      if (denied) return denied;
      const check = buildArchiveCheck("REC090", "心内科");
      return json(ok(check));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-archive-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-archive-check:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: ArchiveCheckInputV14 = {
        hasDischargeSummary: Boolean(obj?.hasDischargeSummary ?? false),
        hasSignature: Boolean(obj?.hasSignature ?? false),
        hasPayment: Boolean(obj?.hasPayment ?? false),
      };
      const result = checkArchiveReadiness(input);
      const report = buildArchiveCheckReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
