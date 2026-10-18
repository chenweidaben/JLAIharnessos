/**
 * 健澜科技 jlmedaios - 单病种质量管理 V13 路由（M452-B，医院评审与临床质量改进组）
 *
 * GET /api/v1/single-disease-quality-mgmt
 *
 * 权限：single-disease-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSingleDiseaseAverageLengthOfStayV13,
  computeSingleDiseaseControlIndicatorComplianceRateV13,
  computeSingleDiseaseReportRateV13,
  type SingleDiseaseQualityMgmtRecordV13,
} from "../aggregators/singleDiseaseQualityMgmtV13Aggregator.js";

const records: SingleDiseaseQualityMgmtRecordV13[] = [
  { reported: 950, shouldReport: 1000, qualified: 900, totalIndicator: 1000, lengthOfStay: 7.3 },
  { reported: 950, shouldReport: 1000, qualified: 900, totalIndicator: 1000, lengthOfStay: 7.7 },
];

export const singleDiseaseQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/single-disease-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "single-disease-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        singleDiseaseReportRate: computeSingleDiseaseReportRateV13(records),
        singleDiseaseControlIndicatorComplianceRate: computeSingleDiseaseControlIndicatorComplianceRateV13(records),
        singleDiseaseAverageLengthOfStay: computeSingleDiseaseAverageLengthOfStayV13(records),
      }));
    },
  },
];
