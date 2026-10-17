/**
 * 健澜科技 jlmedaios - 医院质量监测 HQMS V5 路由（M278-D）
 *
 * GET /api/v1/hqms（HQMS指标看板）
 * POST /api/v1/hqms/collect（采集校验）
 * GET /api/v1/hqms/benchmark（对标报告）
 *
 * 权限：hqms:read / hqms:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  benchmarkHQMSV5,
  buildHQMSV5Report,
  collectHQMSMetricsV5,
  type HQMSMetric,
} from "../aggregators/hqmsV5Aggregator.js";

const metricStore: HQMSMetric[] = collectHQMSMetricsV5([
  { metricCode: "mortality-30d", metricName: "31天死亡率", value: 1.2, period: "2026Q3", department: "全院" },
  { metricCode: "infection-ipm", metricName: "院感千日感染", value: 3.5, period: "2026Q3", department: "全院" },
  { metricCode: "bed-turnover", metricName: "床位周转", value: 28, period: "2026Q3", department: "全院" },
]);

export const hqmsV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hqms",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hqms:read");
      if (denied) return denied;

      return json(ok(buildHQMSV5Report(metricStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/hqms/collect",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hqms:write");
      if (denied) return denied;

      const body = await c.req.json() as Omit<HQMSMetric, "benchmark">[];
      const collected = collectHQMSMetricsV5(body);
      metricStore.push(...collected);
      return json(ok({ collected: collected.length }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/hqms/benchmark",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hqms:read");
      if (denied) return denied;

      return json(ok(benchmarkHQMSV5(metricStore)));
    },
  },
];
