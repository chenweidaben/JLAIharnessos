/**
 * 健澜科技 jlmedaios - 应急演练管理 V13 路由（M447-A，应急管理与安全生产管理组）
 *
 * GET /api/v1/emergency-drill-mgmt
 *
 * 权限：emergency-drill-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyDrillAssessmentQualifiedRateV13,
  computeEmergencyDrillPlanCompletionRateV13,
  computeEmergencyDrillSubjectCoverageRateV13,
  type EmergencyDrillMgmtRecordV13,
} from "../aggregators/emergencyDrillMgmtV13Aggregator.js";

const records: EmergencyDrillMgmtRecordV13[] = [
  { completedDrill: 950, plannedDrill: 1000, coveredSubject: 900, totalSubject: 1000, qualifiedDrill: 980, totalDrill: 1000 },
  { completedDrill: 950, plannedDrill: 1000, coveredSubject: 900, totalSubject: 1000, qualifiedDrill: 980, totalDrill: 1000 },
];

export const emergencyDrillMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emergency-drill-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emergency-drill-mgmt:read");
      if (denied) return denied;
      return json(ok({
        emergencyDrillPlanCompletionRate: computeEmergencyDrillPlanCompletionRateV13(records),
        emergencyDrillSubjectCoverageRate: computeEmergencyDrillSubjectCoverageRateV13(records),
        emergencyDrillAssessmentQualifiedRate: computeEmergencyDrillAssessmentQualifiedRateV13(records),
      }));
    },
  },
];
