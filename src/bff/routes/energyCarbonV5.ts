/**
 * 健澜科技 jlmedaios - 能源碳排放与绿色医院 V5 路由（M279-D）
 *
 * GET /api/v1/energy-carbon（能耗碳排看板）
 * POST /api/v1/energy-carbon/measure（节能措施登记）
 * GET /api/v1/energy-carbon/reduction（减排进度）
 *
 * 权限：energy-carbon:read / energy-carbon:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildEnergyCarbonV5Report,
  calculateCarbonV5,
  trackCarbonReductionV5,
  type EnergyUsage,
} from "../aggregators/energyCarbonV5Aggregator.js";

const usageStore: EnergyUsage[] = [
  { zone: "门诊楼", kwh: 50000, water: 200, gas: 500 },
  { zone: "住院部", kwh: 80000, water: 500, gas: 1000 },
  { zone: "行政楼", kwh: 10000, water: 50, gas: 100 },
];

const BASELINE_CARBON = 120000;
const TARGET_CARBON = 90000;

export const energyCarbonV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/energy-carbon",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "energy-carbon:read");
      if (denied) return denied;

      return json(ok(buildEnergyCarbonV5Report(usageStore, BASELINE_CARBON, TARGET_CARBON)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/energy-carbon/measure",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "energy-carbon:write");
      if (denied) return denied;

      const body = await c.req.json() as { measure: string; estimatedKwhSaved: number };
      const carbonSaved = calculateCarbonV5({ zone: "", kwh: body.estimatedKwhSaved, water: 0, gas: 0 }).carbonKg;
      return json(ok({ recorded: true, measure: body.measure, carbonSavedKg: carbonSaved }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/energy-carbon/reduction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "energy-carbon:read");
      if (denied) return denied;

      const totalCarbon = usageStore.reduce((s, u) => s + calculateCarbonV5(u).carbonKg, 0);
      return json(ok(trackCarbonReductionV5(totalCarbon, TARGET_CARBON, BASELINE_CARBON)));
    },
  },
];
