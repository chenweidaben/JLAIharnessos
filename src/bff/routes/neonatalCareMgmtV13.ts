/**
 * 健澜科技 jlmedaios - 新生儿护理管理 V13 路由（M428-A，换名避让旧版 neonatalMgmtV13（M412，-care 后缀））
 *
 * GET /api/v1/neonatal-care-mgmt
 *
 * 权限：neonatal-care-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNeonatalAsphyxiaOccurrenceRateV13,
  computeNeonatalJaundiceMonitoringRateV13,
  computeNeonatalMortalityRateV13,
  type NeonatalCareMgmtRecordV13,
} from "../aggregators/neonatalCareMgmtV13Aggregator.js";

const records: NeonatalCareMgmtRecordV13[] = [
  { neonatalDeath: 5, liveBirth: 10000, asphyxia: 20, jaundiceMonitored: 950, neonatalTotal: 1000 },
  { neonatalDeath: 5, liveBirth: 10000, asphyxia: 20, jaundiceMonitored: 950, neonatalTotal: 1000 },
];

export const neonatalCareMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/neonatal-care-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "neonatal-care-mgmt:read");
      if (denied) return denied;
      return json(ok({
        neonatalMortalityRate: computeNeonatalMortalityRateV13(records),
        neonatalAsphyxiaOccurrenceRate: computeNeonatalAsphyxiaOccurrenceRateV13(records),
        neonatalJaundiceMonitoringRate: computeNeonatalJaundiceMonitoringRateV13(records),
      }));
    },
  },
];
