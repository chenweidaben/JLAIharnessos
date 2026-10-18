/**
 * 健澜科技 jlmedaios - 重点学科建设管理 V13 路由（M456-A，学科建设与科研管理组）
 *
 * GET /api/v1/discipline-construction-mgmt
 *
 * 权限：discipline-construction-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDisciplineConstructionAnnualAssessmentRateV13,
  computeDisciplineConstructionFundExecutionRateV13,
  computeDisciplineConstructionLeaderComplianceRateV13,
  type DisciplineConstructionMgmtRecordV13,
} from "../aggregators/disciplineConstructionMgmtV13Aggregator.js";

const records: DisciplineConstructionMgmtRecordV13[] = [
  { qualified: 950, totalDiscipline: 1000, compliant: 900, totalLeader: 1000, executed: 980, totalFund: 1000 },
  { qualified: 950, totalDiscipline: 1000, compliant: 900, totalLeader: 1000, executed: 980, totalFund: 1000 },
];

export const disciplineConstructionMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/discipline-construction-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "discipline-construction-mgmt:read");
      if (denied) return denied;
      return json(ok({
        disciplineConstructionAnnualAssessmentRate: computeDisciplineConstructionAnnualAssessmentRateV13(records),
        disciplineConstructionLeaderComplianceRate: computeDisciplineConstructionLeaderComplianceRateV13(records),
        disciplineConstructionFundExecutionRate: computeDisciplineConstructionFundExecutionRateV13(records),
      }));
    },
  },
];
