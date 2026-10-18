/**
 * 健澜科技 jlmedaios - ICU 护理管理 V13 路由（M428-D，M428 收官，换名避让旧版 icuMgmtV13（M416，-care 后缀））
 *
 * GET /api/v1/icu-care-mgmt
 *
 * 权限：icu-care-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIcuCatheterRelatedInfectionRateV13,
  computeIcuMortalityRateV13,
  computeIcuPressureUlcerOccurrenceRateV13,
  type IcuCareMgmtRecordV13,
} from "../aggregators/icuCareMgmtV13Aggregator.js";

const records: IcuCareMgmtRecordV13[] = [
  { icuDeath: 15, icuDischargeTotal: 100, icuPressureUlcer: 5, icuTotal: 100, catheterInfection: 3, catheterTotal: 100 },
  { icuDeath: 15, icuDischargeTotal: 100, icuPressureUlcer: 5, icuTotal: 100, catheterInfection: 3, catheterTotal: 100 },
];

export const icuCareMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/icu-care-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "icu-care-mgmt:read");
      if (denied) return denied;
      return json(ok({
        icuMortalityRate: computeIcuMortalityRateV13(records),
        icuPressureUlcerOccurrenceRate: computeIcuPressureUlcerOccurrenceRateV13(records),
        icuCatheterRelatedInfectionRate: computeIcuCatheterRelatedInfectionRateV13(records),
      }));
    },
  },
];
