/**
 * 健澜科技 jlmedaios - 急诊容量预警 V13 路由（M312-D）
 *
 * GET /api/v1/emergency-capacity
 *
 * 权限：emergency-capacity:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  assessWaitTimeV13,
  computeObsBedOccupancyV13,
  identifyNeedReinforceV13,
} from "../aggregators/emergencyCapacityV13Aggregator.js";

const obsBeds = { total: 50, occupied: 45 };
const avgWaitMin = 45;

export const emergencyCapacityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-capacity",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-capacity:read");
      if (denied) return denied;
      const occupancy = computeObsBedOccupancyV13(obsBeds);
      return json(ok({
        obsBeds,
        occupancyRate: occupancy,
        waitLight: assessWaitTimeV13(avgWaitMin),
        avgWaitMin,
        reinforce: identifyNeedReinforceV13(occupancy, avgWaitMin),
      }));
    },
  },
];
