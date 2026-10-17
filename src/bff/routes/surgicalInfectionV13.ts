/**
 * 健澜科技 jlmedaios - 手术部位感染 V13 路由（M357-C）
 *
 * GET /api/v1/surgical-infection
 *
 * 权限：surgical-infection:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClass1IncisionInfectionRateV13,
  computePerioperativeProphylaxisRationalRateV13,
  computeSsiRateV13,
  type SurgicalInfectionRecordV13,
} from "../aggregators/surgicalInfectionV13Aggregator.js";

const records: SurgicalInfectionRecordV13[] = [
  { ssiInfected: 2, surgeryCount: 1000, class1Infected: 1, class1IncisionCount: 500, prophylaxisRational: 480, prophylaxisCount: 500 },
  { ssiInfected: 2, surgeryCount: 1000, class1Infected: 1, class1IncisionCount: 500, prophylaxisRational: 470, prophylaxisCount: 500 },
];

export const surgicalInfectionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/surgical-infection",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "surgical-infection:read");
      if (denied) return denied;
      return json(ok({
        ssiRate: computeSsiRateV13(records),
        class1InfectionRate: computeClass1IncisionInfectionRateV13(records),
        prophylaxisRationalRate: computePerioperativeProphylaxisRationalRateV13(records),
      }));
    },
  },
];
