/**
 * 健澜科技 jlmedaios - 再入院分析管理 V13 路由（M427-C，换名避让旧版 readmissionMgmtV13（M411，-analysis 后缀））
 *
 * GET /api/v1/readmission-analysis-mgmt
 *
 * 权限：readmission-analysis-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  compute31DayReadmissionRateV13,
  computeReadmissionCauseDistributionRateV13,
  computeReadmissionInterventionRateV13,
  type ReadmissionAnalysisMgmtRecordV13,
} from "../aggregators/readmissionAnalysisMgmtV13Aggregator.js";

const records: ReadmissionAnalysisMgmtRecordV13[] = [
  { readmit31: 30, dischargeTotal: 1000, causeChronicWorsening: 40, interventionDone: 85, readmitTotal: 100 },
  { readmit31: 30, dischargeTotal: 1000, causeChronicWorsening: 40, interventionDone: 85, readmitTotal: 100 },
];

export const readmissionAnalysisMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/readmission-analysis-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "readmission-analysis-mgmt:read");
      if (denied) return denied;
      return json(ok({
        readmission31DayRate: compute31DayReadmissionRateV13(records),
        readmissionCauseDistributionRate: computeReadmissionCauseDistributionRateV13(records),
        readmissionInterventionRate: computeReadmissionInterventionRateV13(records),
      }));
    },
  },
];
