/**
 * 健澜科技 jlmedaios - 病历质量趋势分析 V14 路由（M536-B）
 *
 * GET  /api/v1/emr-quality-trend  （read，auth:true）返回趋势分析基础数据
 * POST /api/v1/emr-quality-trend  （auth:true）趋势分析 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQualityTrend,
  buildQualityTrendReport,
  analyzeQualityTrend,
  type QualityTrendInputV14,
} from "../aggregators/emrQualityTrendV14Aggregator.js";

export const emrQualityTrendV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-quality-trend",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quality-trend:read");
      if (denied) return denied;
      const trend = buildQualityTrend("心内科", 2026);
      return json(ok(trend));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-quality-trend",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-quality-trend:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const scoresRaw = Array.isArray(obj?.scores) ? obj.scores : [];
      const input: QualityTrendInputV14 = {
        scores: scoresRaw.map((s: unknown) => Number(s) || 0),
      };
      const result = analyzeQualityTrend(input);
      const report = buildQualityTrendReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
