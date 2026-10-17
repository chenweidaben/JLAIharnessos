/**
 * 健澜科技 jlmedaios - 院感监测 V13 路由（M370-B）
 *
 * GET /api/v1/infection-surveillance
 *
 * 权限：infection-surveillance:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIcuCatheterRelatedInfectionRateV13,
  computeMdroDetectionRateV13,
  computeSurgicalSiteInfectionRateV13,
  type InfectionSurveillanceRecordV13,
} from "../aggregators/infectionSurveillanceV13Aggregator.js";

const records: InfectionSurveillanceRecordV13[] = [
  { mdroTested: 200, mdroDetected: 20, surgeryCount: 100, ssiCount: 1, catheterDays: 1000, catheterInfectionCount: 2 },
  { mdroTested: 200, mdroDetected: 20, surgeryCount: 100, ssiCount: 1, catheterDays: 1000, catheterInfectionCount: 2 },
];

export const infectionSurveillanceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/infection-surveillance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "infection-surveillance:read");
      if (denied) return denied;
      return json(ok({
        mdroDetectionRate: computeMdroDetectionRateV13(records),
        surgicalSiteInfectionRate: computeSurgicalSiteInfectionRateV13(records),
        icuCatheterRelatedInfectionRate: computeIcuCatheterRelatedInfectionRateV13(records),
      }));
    },
  },
];
