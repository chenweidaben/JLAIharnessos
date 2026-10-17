/**
 * 健澜科技 jlmedaios - 预防接种 V13 路由（M349-D，M349 收官）
 *
 * GET /api/v1/immunization
 *
 * 权限：immunization:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBoosterRateV13,
  computeCardCreationRateV13,
  computeSingleVaccineRateV13,
  type ImmunizationRecordV13,
} from "../aggregators/immunizationV13Aggregator.js";

const records: ImmunizationRecordV13[] = [
  { cardCreatedCount: 48, shouldCreateCardCount: 50, singleVaccinatedCount: 48, shouldVaccinateCount: 50, boosterDoneCount: 40, shouldBoosterCount: 40 },
  { cardCreatedCount: 47, shouldCreateCardCount: 50, singleVaccinatedCount: 46, shouldVaccinateCount: 50, boosterDoneCount: 38, shouldBoosterCount: 40 },
];

export const immunizationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/immunization",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "immunization:read");
      if (denied) return denied;
      return json(ok({
        cardCreationRate: computeCardCreationRateV13(records),
        singleVaccineRate: computeSingleVaccineRateV13(records),
        boosterRate: computeBoosterRateV13(records),
      }));
    },
  },
];
