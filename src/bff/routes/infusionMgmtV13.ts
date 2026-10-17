/**
 * 健澜科技 jlmedaios - 输液管理 V13 路由（M359-D，M359 收官）
 *
 * GET /api/v1/infusion-mgmt
 *
 * 权限：infusion-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInfusionReactionRateV13,
  computeInpatientAntibioticInfusionRateV13,
  computeOutpatientInfusionRateV13,
  type InfusionMgmtRecordV13,
} from "../aggregators/infusionMgmtV13Aggregator.js";

const records: InfusionMgmtRecordV13[] = [
  { outpatientInfusionCount: 500, outpatientVisits: 10000, inpatientAntibioticInfusion: 200, inpatientAntibioticUse: 400, infusionReaction: 1, infusionTotal: 500 },
  { outpatientInfusionCount: 500, outpatientVisits: 10000, inpatientAntibioticInfusion: 200, inpatientAntibioticUse: 400, infusionReaction: 1, infusionTotal: 500 },
];

export const infusionMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/infusion-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "infusion-mgmt:read");
      if (denied) return denied;
      return json(ok({
        outpatientInfusionRate: computeOutpatientInfusionRateV13(records),
        inpatientAntibioticInfusionRate: computeInpatientAntibioticInfusionRateV13(records),
        infusionReactionRate: computeInfusionReactionRateV13(records),
      }));
    },
  },
];
