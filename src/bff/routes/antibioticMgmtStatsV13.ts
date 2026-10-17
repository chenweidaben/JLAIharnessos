/**
 * 健澜科技 jlmedaios - 抗菌药物管理（统计）V13 路由（M368-C，stats避让）
 *
 * GET /api/v1/antibiotic-mgmt-stats
 *
 * 权限：antibiotic-mgmt-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAntibioticDddsV13,
  computeAntibioticUsageRateV13,
  computeSpecialAntibioticUsageRateV13,
  type AntibioticMgmtStatsRecordV13,
} from "../aggregators/antibioticMgmtStatsV13Aggregator.js";

const records: AntibioticMgmtStatsRecordV13[] = [
  { visitCount: 1000, antibioticUsed: 300, ddds: 100.5, specialLevelUsed: 30 },
  { visitCount: 1000, antibioticUsed: 300, ddds: 100.5, specialLevelUsed: 30 },
];

export const antibioticMgmtStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/antibiotic-mgmt-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "antibiotic-mgmt-stats:read");
      if (denied) return denied;
      return json(ok({
        antibioticUsageRate: computeAntibioticUsageRateV13(records),
        antibioticDdds: computeAntibioticDddsV13(records),
        specialAntibioticUsageRate: computeSpecialAntibioticUsageRateV13(records),
      }));
    },
  },
];
