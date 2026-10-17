/**
 * 健澜科技 jlmedaios - 门诊与手术量预测 V3 路由（M277-A）
 *
 * GET  /api/v1/volume-forecast（预测看板）
 * POST /api/v1/volume-forecast/actual（手动录入实际值回灌）
 *
 * 权限：volume-forecast:read / volume-forecast:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildVolumeForecastV3Report,
  detectAnomalyV3,
  forecastVolumeV3,
  type VolumeHistory,
} from "../aggregators/volumeForecastV3Aggregator.js";

const historyStore: VolumeHistory[] = [
  { date: "d1", actual: 120, weekday: 1, isHoliday: false },
  { date: "d2", actual: 130, weekday: 2, isHoliday: false },
  { date: "d3", actual: 110, weekday: 3, isHoliday: false },
];

export const volumeForecastV3Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/volume-forecast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "volume-forecast:read");
      if (denied) return denied;

      const department = c.query.get("department") ?? "内科";
      const horizon = Number(c.query.get("horizon") ?? "7");
      const results = forecastVolumeV3(historyStore, horizon);
      const report = buildVolumeForecastV3Report(department, results);
      return json(ok(report));
    },
  },
  {
    method: "POST",
    path: "/api/v1/volume-forecast/actual",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "volume-forecast:write");
      if (denied) return denied;

      const body = await c.req.json() as { date: string; actual: number; weekday: number; isHoliday: boolean };
      historyStore.push({ date: body.date, actual: body.actual, weekday: body.weekday, isHoliday: body.isHoliday });
      const anomaly = detectAnomalyV3(body.actual, { upper: body.actual * 1.2, lower: body.actual * 0.8 });
      return json(ok({ recorded: true, anomaly }));
    },
  },
];
