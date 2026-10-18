/**
 * 健澜科技 jlmedaios - 质控科室对比雷达图 V14 路由（M506-B）
 *
 * GET /api/v1/emr-qc-dept-radar-chart  （read，auth:true）返回雷达图数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateRadarChart,
  buildRadarChart,
  type RadarChartV14,
} from "../aggregators/emrQcDeptRadarChartV14Aggregator.js";

const sampleCharts: RadarChartV14[] = [
  buildRadarChart("内科", [
    { name: "书写规范", score: 90 },
    { name: "及时性", score: 85 },
    { name: "完整性", score: 95 },
  ]),
  buildRadarChart("外科", [
    { name: "书写规范", score: 80 },
    { name: "及时性", score: 75 },
    { name: "完整性", score: 88 },
  ]),
];

const aggregates = sampleCharts.map((c) => aggregateRadarChart(c));

export const emrQcDeptRadarChartV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dept-radar-chart",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-radar-chart:read");
      if (denied) return denied;
      return json(ok({ charts: sampleCharts, aggregates }));
    },
  },
];
