/**
 * 健澜科技 jlmedaios - 信息系统质量管理 V13 路由（M432-A，-quality 后缀避让旧版 informationSystemMgmtV13（M409））
 *
 * GET /api/v1/information-system-quality-mgmt
 *
 * 权限：information-system-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSystemAvailabilityRateV13,
  computeSystemFailureRateV13,
  computeSystemResponseTimeMinutesV13,
  type InformationSystemQualityMgmtRecordV13,
} from "../aggregators/informationSystemQualityMgmtV13Aggregator.js";

const records: InformationSystemQualityMgmtRecordV13[] = [
  { availableMinutes: 9800, requiredMinutes: 10000, responseMinutes: 2.5, failureCount: 20, runTotal: 10000 },
  { availableMinutes: 9800, requiredMinutes: 10000, responseMinutes: 3.4, failureCount: 20, runTotal: 10000 },
];

export const informationSystemQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/information-system-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "information-system-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        systemAvailabilityRate: computeSystemAvailabilityRateV13(records),
        systemResponseTimeMinutes: computeSystemResponseTimeMinutesV13(records),
        systemFailureRate: computeSystemFailureRateV13(records),
      }));
    },
  },
];
