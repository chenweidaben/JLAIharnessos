/**
 * 健澜科技 jlmedaios - 病历质控综合看板（避让版）V14 路由（M542-A）
 *
 * GET  /api/v1/emr-qc-comprehensive-dashboard  （read，auth:true）返回质控看板基础数据
 * POST /api/v1/emr-qc-comprehensive-dashboard  （auth:true）看板加载 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQcComprehensiveDashboard,
  buildQcComprehensiveDashboardReport,
  loadQcComprehensiveDashboard,
  type QcComprehensiveDashboardInputV14,
} from "../aggregators/emrQcComprehensiveDashboardV14Aggregator.js";

export const emrQcComprehensiveDashboardV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-comprehensive-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-comprehensive-dashboard:read");
      if (denied) return denied;
      const base = buildQcComprehensiveDashboard("心内科", "2026-10");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-comprehensive-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-comprehensive-dashboard:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: QcComprehensiveDashboardInputV14 = {
        totalRecords: Number(obj?.totalRecords ?? 0),
        qualifiedRecords: Number(obj?.qualifiedRecords ?? 0),
        defectCount: Number(obj?.defectCount ?? 0),
      };
      const result = loadQcComprehensiveDashboard(input);
      const report = buildQcComprehensiveDashboardReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
