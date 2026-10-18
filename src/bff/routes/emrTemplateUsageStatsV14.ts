/**
 * 健澜科技 jlmedaios - 模板使用统计分析 V14 路由（M525-C）
 *
 * GET  /api/v1/emr-template-usage-stats  （read，auth:true）返回使用统计基础数据
 * POST /api/v1/emr-template-usage-stats  （auth:true）使用统计分析 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildUsageStats,
  buildUsageStatsReport,
  analyzeTemplateUsage,
  type UsageStatsInputV14,
} from "../aggregators/emrTemplateUsageStatsV14Aggregator.js";

export const emrTemplateUsageStatsV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-template-usage-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-usage-stats:read");
      if (denied) return denied;
      const stats = buildUsageStats("心内科", "2026-Q3");
      return json(ok(stats));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-template-usage-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-template-usage-stats:write");
      if (denied) return denied;
      const body = await c.req.json();
      const input: UsageStatsInputV14 = {
        templateName: String(body?.templateName ?? ""),
        usedCount: Number(body?.usedCount ?? 0),
        totalRecords: Number(body?.totalRecords ?? 0),
      };
      const result = analyzeTemplateUsage(input);
      const report = buildUsageStatsReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
