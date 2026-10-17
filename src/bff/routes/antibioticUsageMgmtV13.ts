/**
 * 健澜科技 jlmedaios - 抗菌药物使用管理 V13 路由（M421-B，换名避让旧版 antiInfectionDetailV13）
 *
 * GET /api/v1/antibiotic-usage-mgmt
 *
 * 权限：antibiotic-usage-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAntibioticEtiologyTestRateV13,
  computeAntibioticUsageDDDsV13,
  computeSpecialGradeAntibioticConsultRateV13,
  type AntibioticUsageMgmtRecordV13,
} from "../aggregators/antibioticUsageMgmtV13Aggregator.js";

const records: AntibioticUsageMgmtRecordV13[] = [
  { dddsSum: 40.5, etiologyTest: 950, antibioticUse: 1000, specialConsult: 980, specialUse: 1000 },
  { dddsSum: 42.3, etiologyTest: 950, antibioticUse: 1000, specialConsult: 980, specialUse: 1000 },
];

export const antibioticUsageMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/antibiotic-usage-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "antibiotic-usage-mgmt:read");
      if (denied) return denied;
      return json(ok({
        antibioticUsageDDDs: computeAntibioticUsageDDDsV13(records),
        antibioticEtiologyTestRate: computeAntibioticEtiologyTestRateV13(records),
        specialGradeAntibioticConsultRate: computeSpecialGradeAntibioticConsultRateV13(records),
      }));
    },
  },
];
