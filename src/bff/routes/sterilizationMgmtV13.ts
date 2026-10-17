/**
 * 健澜科技 jlmedaios - 消毒灭菌管理 V13 路由（M423-C）
 *
 * GET /api/v1/sterilization-mgmt
 *
 * 权限：sterilization-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDisinfectionEffectMonitoringPassRateV13,
  computeSterilizationPassRateV13,
  computeSterileStorageComplianceRateV13,
  type SterilizationMgmtRecordV13,
} from "../aggregators/sterilizationMgmtV13Aggregator.js";

const records: SterilizationMgmtRecordV13[] = [
  { passBatch: 990, totalBatch: 1000, passMonitor: 980, totalMonitor: 1000, compliantPoint: 970, totalPoint: 1000 },
  { passBatch: 990, totalBatch: 1000, passMonitor: 980, totalMonitor: 1000, compliantPoint: 970, totalPoint: 1000 },
];

export const sterilizationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/sterilization-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "sterilization-mgmt:read");
      if (denied) return denied;
      return json(ok({
        sterilizationPassRate: computeSterilizationPassRateV13(records),
        disinfectionEffectMonitoringPassRate: computeDisinfectionEffectMonitoringPassRateV13(records),
        sterileStorageComplianceRate: computeSterileStorageComplianceRateV13(records),
      }));
    },
  },
];
