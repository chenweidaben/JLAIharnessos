/**
 * 健澜科技 jlmedaios - 医院文化建设管理 V13 路由（M457-A，医院文化与公益管理组）
 *
 * GET /api/v1/hospital-culture-mgmt
 *
 * 权限：hospital-culture-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHospitalCultureActivityParticipationRateV13,
  computeHospitalCultureEmployeeSatisfactionRateV13,
  computeHospitalCultureVenueOpenRateV13,
  type HospitalCultureMgmtRecordV13,
} from "../aggregators/hospitalCultureMgmtV13Aggregator.js";

const records: HospitalCultureMgmtRecordV13[] = [
  { participated: 950, totalEmployee: 1000, satisfied: 900, totalSurvey: 1000, opened: 980, totalVenue: 1000 },
  { participated: 950, totalEmployee: 1000, satisfied: 900, totalSurvey: 1000, opened: 980, totalVenue: 1000 },
];

export const hospitalCultureMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hospital-culture-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hospital-culture-mgmt:read");
      if (denied) return denied;
      return json(ok({
        hospitalCultureActivityParticipationRate: computeHospitalCultureActivityParticipationRateV13(records),
        hospitalCultureEmployeeSatisfactionRate: computeHospitalCultureEmployeeSatisfactionRateV13(records),
        hospitalCultureVenueOpenRate: computeHospitalCultureVenueOpenRateV13(records),
      }));
    },
  },
];
