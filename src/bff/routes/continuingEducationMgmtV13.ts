/**
 * 健澜科技 jlmedaios - 继续医学教育 V13 路由（M443-B，教学科研与继续教育管理组）
 *
 * GET /api/v1/continuing-education-mgmt
 *
 * 权限：continuing-education-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeContinuingEducationCreditComplianceRateV13,
  computeContinuingEducationNationalProjectRateV13,
  computeContinuingEducationProvincialProjectRateV13,
  type ContinuingEducationMgmtRecordV13,
} from "../aggregators/continuingEducationMgmtV13Aggregator.js";

const records: ContinuingEducationMgmtRecordV13[] = [
  { creditCompliant: 950, shouldComplete: 1000, nationalProjectParticipated: 900, shouldParticipate: 1000, provincialProjectParticipated: 980 },
  { creditCompliant: 950, shouldComplete: 1000, nationalProjectParticipated: 900, shouldParticipate: 1000, provincialProjectParticipated: 980 },
];

export const continuingEducationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/continuing-education-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "continuing-education-mgmt:read");
      if (denied) return denied;
      return json(ok({
        continuingEducationCreditComplianceRate: computeContinuingEducationCreditComplianceRateV13(records),
        continuingEducationNationalProjectRate: computeContinuingEducationNationalProjectRateV13(records),
        continuingEducationProvincialProjectRate: computeContinuingEducationProvincialProjectRateV13(records),
      }));
    },
  },
];
