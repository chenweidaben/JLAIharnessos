/**
 * 健澜科技 jlmedaios - 院感控制 V13 路由（M370-A）
 *
 * GET /api/v1/infection-control
 *
 * 权限：infection-control:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDisinfectionSterilizationPassRateV13,
  computeHandHygieneComplianceRateV13,
  computeInfectionRateV13,
  type InfectionControlRecordV13,
} from "../aggregators/infectionControlV13Aggregator.js";

const records: InfectionControlRecordV13[] = [
  { inpatientCount: 1000, infectionCount: 5, handHygieneShould: 1000, handHygieneDone: 900, disinfectionSample: 100, disinfectionPass: 98 },
  { inpatientCount: 1000, infectionCount: 5, handHygieneShould: 1000, handHygieneDone: 900, disinfectionSample: 100, disinfectionPass: 98 },
];

export const infectionControlV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/infection-control",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "infection-control:read");
      if (denied) return denied;
      return json(ok({
        infectionRate: computeInfectionRateV13(records),
        handHygieneComplianceRate: computeHandHygieneComplianceRateV13(records),
        disinfectionSterilizationPassRate: computeDisinfectionSterilizationPassRateV13(records),
      }));
    },
  },
];
