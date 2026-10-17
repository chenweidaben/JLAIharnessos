/**
 * 健澜科技 jlmedaios - 疫苗接种 V13 路由（M393-D，M393 收官）
 *
 * GET /api/v1/vaccination-mgmt
 *
 * 权限：vaccination-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFluVaccinationRateV13,
  computeHBsAbPositiveRateV13,
  computeHealthcareWorkerVaccinationRateV13,
  type VaccinationMgmtRecordV13,
} from "../aggregators/vaccinationMgmtV13Aggregator.js";

const records: VaccinationMgmtRecordV13[] = [
  { vaccinatedCount: 950, shouldCount: 1000, fluVaccinatedCount: 900, fluShouldCount: 1000, positiveCount: 980, testedCount: 1000 },
  { vaccinatedCount: 950, shouldCount: 1000, fluVaccinatedCount: 900, fluShouldCount: 1000, positiveCount: 980, testedCount: 1000 },
];

export const vaccinationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/vaccination-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "vaccination-mgmt:read");
      if (denied) return denied;
      return json(ok({
        healthcareWorkerVaccinationRate: computeHealthcareWorkerVaccinationRateV13(records),
        fluVaccinationRate: computeFluVaccinationRateV13(records),
        hBsAbPositiveRate: computeHBsAbPositiveRateV13(records),
      }));
    },
  },
];
