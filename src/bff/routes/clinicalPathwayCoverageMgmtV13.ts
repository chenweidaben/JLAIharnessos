/**
 * 健澜科技 jlmedaios - 临床路径管理（覆盖率视角）V13 路由（M452-C，医院评审与临床质量改进组）
 *
 * GET /api/v1/clinical-pathway-coverage-mgmt
 *
 * 避让说明：基础名 clinicalPathwayMgmtV13 已被早期切片占用，本切片改用 -coverage 维度后缀避让。
 *
 * 权限：clinical-pathway-coverage-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClinicalPathwayCoverageCompletionRateV13,
  computeClinicalPathwayCoverageEnrollmentRateV13,
  computeClinicalPathwayCoverageVariationRateV13,
  type ClinicalPathwayCoverageMgmtRecordV13,
} from "../aggregators/clinicalPathwayCoverageMgmtV13Aggregator.js";

const records: ClinicalPathwayCoverageMgmtRecordV13[] = [
  { enrolled: 950, eligible: 1000, completed: 900, enrolledTotal: 1000, variation: 30 },
  { enrolled: 950, eligible: 1000, completed: 900, enrolledTotal: 1000, variation: 30 },
];

export const clinicalPathwayCoverageMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-pathway-coverage-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-pathway-coverage-mgmt:read");
      if (denied) return denied;
      return json(ok({
        clinicalPathwayCoverageEnrollmentRate: computeClinicalPathwayCoverageEnrollmentRateV13(records),
        clinicalPathwayCoverageCompletionRate: computeClinicalPathwayCoverageCompletionRateV13(records),
        clinicalPathwayCoverageVariationRate: computeClinicalPathwayCoverageVariationRateV13(records),
      }));
    },
  },
];
