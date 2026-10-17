/**
 * 健澜科技 jlmedaios - 信息系统管理 V13 路由（M409-A）
 *
 * GET /api/v1/information-system-mgmt
 *
 * 权限：information-system-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHISAvailabilityRateV13,
  computeLISAvailabilityRateV13,
  computePACSAvailabilityRateV13,
  type InformationSystemMgmtRecordV13,
} from "../aggregators/informationSystemMgmtV13Aggregator.js";

const records: InformationSystemMgmtRecordV13[] = [
  { hisUptime: 980, hisTotal: 1000, lisUptime: 970, lisTotal: 1000, pacsUptime: 990, pacsTotal: 1000 },
  { hisUptime: 980, hisTotal: 1000, lisUptime: 970, lisTotal: 1000, pacsUptime: 990, pacsTotal: 1000 },
];

export const informationSystemMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/information-system-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "information-system-mgmt:read");
      if (denied) return denied;
      return json(ok({
        hisAvailabilityRate: computeHISAvailabilityRateV13(records),
        lisAvailabilityRate: computeLISAvailabilityRateV13(records),
        pacsAvailabilityRate: computePACSAvailabilityRateV13(records),
      }));
    },
  },
];
