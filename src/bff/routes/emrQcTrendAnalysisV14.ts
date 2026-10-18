/**
 * 健澜科技 jlmedaios - 质控问题趋势分析（避让版）V14 路由（M542-D，M542 收官）
 *
 * GET  /api/v1/emr-qc-trend-analysis  （read，auth:true）返回质控趋势基础数据
 * POST /api/v1/emr-qc-trend-analysis  （auth:true）趋势分析 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQcTrendAnalysis,
  buildQcTrendAnalysisReport,
  analyzeQcTrendAnalysis,
  type QcTrendAnalysisInputV14,
} from "../aggregators/emrQcTrendAnalysisV14Aggregator.js";

export const emrQcTrendAnalysisV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-trend-analysis",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-trend-analysis:read");
      if (denied) return denied;
      const base = buildQcTrendAnalysis("心内科", 2026);
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-trend-analysis",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-trend-analysis:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const rawArr = Array.isArray(obj?.monthlyDefects) ? (obj.monthlyDefects as unknown[]) : [];
      const monthlyDefects: number[] = rawArr.map((v) => Number(v ?? 0));
      const input: QcTrendAnalysisInputV14 = { monthlyDefects };
      const result = analyzeQcTrendAnalysis(input);
      const report = buildQcTrendAnalysisReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
