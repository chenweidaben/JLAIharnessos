/**
 * 健澜科技 jlmedaios - 质控缺陷趋势图 V14 路由（M506-A）
 *
 * GET /api/v1/emr-qc-defect-trend-chart  （read，auth:true）返回趋势图数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateTrendChart,
  buildTrendChart,
  type TrendChartV14,
} from "../aggregators/emrQcDefectTrendChartV14Aggregator.js";

const sampleData: TrendChartV14[] = [
  buildTrendChart("2026-01", 45),
  buildTrendChart("2026-02", 60),
  buildTrendChart("2026-03", 30),
];

const aggregate = aggregateTrendChart(sampleData);

export const emrQcDefectTrendChartV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-defect-trend-chart",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-defect-trend-chart:read");
      if (denied) return denied;
      return json(ok({ data: sampleData, aggregate }));
    },
  },
];
