/**
 * 健澜科技 jlmedaios - 医院运营管理 V13 路由（M459-A，医院运营与健康管理组）
 *
 * GET /api/v1/hospital-operations-mgmt
 *
 * 权限：hospital-operations-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHospitalOperationsAnalysisReportCompleteRateV13,
  computeHospitalOperationsDataReportTimelyRateV13,
  computeHospitalOperationsIndicatorComplianceRateV13,
  type HospitalOperationsMgmtRecordV13,
} from "../aggregators/hospitalOperationsMgmtV13Aggregator.js";

const records: HospitalOperationsMgmtRecordV13[] = [
  { timely: 950, totalReport: 1000, completed: 900, totalAnalysisReport: 1000, qualified: 980, totalIndicator: 1000 },
  { timely: 950, totalReport: 1000, completed: 900, totalAnalysisReport: 1000, qualified: 980, totalIndicator: 1000 },
];

export const hospitalOperationsMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hospital-operations-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hospital-operations-mgmt:read");
      if (denied) return denied;
      return json(ok({
        hospitalOperationsDataReportTimelyRate: computeHospitalOperationsDataReportTimelyRateV13(records),
        hospitalOperationsAnalysisReportCompleteRate: computeHospitalOperationsAnalysisReportCompleteRateV13(records),
        hospitalOperationsIndicatorComplianceRate: computeHospitalOperationsIndicatorComplianceRateV13(records),
      }));
    },
  },
];
