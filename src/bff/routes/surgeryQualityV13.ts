/**
 * 健澜科技 jlmedaios - 手术质量 V13 路由（M371-C）
 *
 * GET /api/v1/surgery-quality
 *
 * 权限：surgery-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSurgeryComplicationRateV13,
  computeSurgeryMortalityRateV13,
  computeType1IncisionHealingRateV13,
  type SurgeryQualityRecordV13,
} from "../aggregators/surgeryQualityV13Aggregator.js";

const records: SurgeryQualityRecordV13[] = [
  { surgeryCount: 100, complicationCount: 2, mortalityCount: 1, type1IncisionCount: 50, type1HealingGradeA: 48 },
  { surgeryCount: 100, complicationCount: 2, mortalityCount: 1, type1IncisionCount: 50, type1HealingGradeA: 48 },
];

export const surgeryQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/surgery-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "surgery-quality:read");
      if (denied) return denied;
      return json(ok({
        surgeryComplicationRate: computeSurgeryComplicationRateV13(records),
        surgeryMortalityRate: computeSurgeryMortalityRateV13(records),
        type1IncisionHealingRate: computeType1IncisionHealingRateV13(records),
      }));
    },
  },
];
