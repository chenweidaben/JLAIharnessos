/**
 * 健澜科技 jlmedaios - 指南依从性 V13 路由（M333-B）
 *
 * GET /api/v1/guideline-compliance
 *
 * 权限：guideline-compliance:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCoronaryComplianceV13,
  computeDiabetesComplianceV13,
  computeHypertensionComplianceV13,
  type GuidelineRecordV13,
} from "../aggregators/guidelineComplianceV13Aggregator.js";

const records: GuidelineRecordV13[] = [
  { disease: "高血压", totalPatients: 50, compliantPatients: 40 },
  { disease: "糖尿病", totalPatients: 30, compliantPatients: 24 },
  { disease: "冠心病", totalPatients: 20, compliantPatients: 16 },
];

export const guidelineComplianceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/guideline-compliance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "guideline-compliance:read");
      if (denied) return denied;
      return json(ok({
        hypertension: computeHypertensionComplianceV13(records),
        diabetes: computeDiabetesComplianceV13(records),
        coronary: computeCoronaryComplianceV13(records),
      }));
    },
  },
];
