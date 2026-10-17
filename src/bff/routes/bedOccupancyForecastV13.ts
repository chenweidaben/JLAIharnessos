/**
 * 健澜科技 jlmedaios - 床位占用预测 V13 路由（M312-A）
 *
 * GET /api/v1/bed-occupancy-forecast?days=
 *
 * 权限：bed-occupancy-forecast:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  assessBedTensionV13,
  forecastBedOccupancyV13,
  identifyBedCrisisV13,
  type DeptBedV13,
} from "../aggregators/bedOccupancyForecastV13Aggregator.js";

const departments: DeptBedV13[] = [
  { deptId: "cardio", deptName: "心内科", currentOccupancy: 95 },
  { deptId: "surgery", deptName: "外科", currentOccupancy: 70 },
  { deptId: "icu", deptName: "ICU", currentOccupancy: 85 },
];

export const bedOccupancyForecastV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/bed-occupancy-forecast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "bed-occupancy-forecast:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const days = Number(url.searchParams.get("days") ?? "7");
      const forecast = forecastBedOccupancyV13(departments, days);
      return json(ok({
        days,
        forecast: forecast.map((f) => ({ ...f, tension: assessBedTensionV13(f.avgOccupancy) })),
        crisis: identifyBedCrisisV13(forecast),
      }));
    },
  },
];
