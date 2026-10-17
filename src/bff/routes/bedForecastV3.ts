/**
 * 健澜科技 jlmedaios - 床位需求与周转预测 V3 路由（M277-B）
 *
 * GET  /api/v1/bed-forecast（各病区床位预测）
 * POST /api/v1/bed-forecast/reserve（床位预留/出院协调）
 *
 * 权限：bed-forecast:read / bed-forecast:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildBedForecastV3Report,
  optimizeDischargeV3,
  type BedHistory,
} from "../aggregators/bedForecastV3Aggregator.js";

const wardStore: BedHistory[] = [
  { ward: "心内科", occupied: 48, admitted: 6, discharged: 5, totalBeds: 50 },
  { ward: "呼吸科", occupied: 40, admitted: 4, discharged: 4, totalBeds: 50 },
];

export const bedForecastV3Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/bed-forecast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "bed-forecast:read");
      if (denied) return denied;

      const ward = c.query.get("ward") ?? "心内科";
      const history = wardStore.find((w) => w.ward === ward) ?? wardStore[0];
      const report = buildBedForecastV3Report(ward, history, 6);
      return json(ok(report));
    },
  },
  {
    method: "POST",
    path: "/api/v1/bed-forecast/reserve",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "bed-forecast:write");
      if (denied) return denied;

      const body = await c.req.json() as { wards: { ward: string; occupancyRate: number; readyForDischarge: number }[] };
      const result = optimizeDischargeV3(body.wards);
      return json(ok(result));
    },
  },
];
