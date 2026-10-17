/**
 * 健澜科技 jlmedaios - 核心系统可用率 V13 路由（M344-A）
 *
 * GET /api/v1/system-availability
 *
 * 权限：system-availability:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEMRAvailabilityV13,
  computeHISAvailabilityV13,
  computeLISAvailabilityV13,
  computePACSAvailabilityV13,
  type SystemAvailabilityRecordV13,
} from "../aggregators/systemAvailabilityV13Aggregator.js";

const records: SystemAvailabilityRecordV13[] = [
  {
    hisAvailableMinutes: 21600,
    hisTotalMinutes: 21600,
    emrAvailableMinutes: 21500,
    emrTotalMinutes: 21600,
    lisAvailableMinutes: 21400,
    lisTotalMinutes: 21600,
    pacsAvailableMinutes: 21550,
    pacsTotalMinutes: 21600,
  },
  {
    hisAvailableMinutes: 21600,
    hisTotalMinutes: 21600,
    emrAvailableMinutes: 21500,
    emrTotalMinutes: 21600,
    lisAvailableMinutes: 21400,
    lisTotalMinutes: 21600,
    pacsAvailableMinutes: 21550,
    pacsTotalMinutes: 21600,
  },
];

export const systemAvailabilityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/system-availability",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "system-availability:read");
      if (denied) return denied;
      return json(ok({
        hisAvailability: computeHISAvailabilityV13(records),
        emrAvailability: computeEMRAvailabilityV13(records),
        lisAvailability: computeLISAvailabilityV13(records),
        pacsAvailability: computePACSAvailabilityV13(records),
      }));
    },
  },
];
