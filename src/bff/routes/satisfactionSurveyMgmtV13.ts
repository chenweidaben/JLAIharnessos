/**
 * 健澜科技 jlmedaios - 满意度调查管理 V13 路由（M451-D，M451 收官，医患关系与投诉管理组）
 *
 * GET /api/v1/satisfaction-survey-mgmt
 *
 * 权限：satisfaction-survey-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSatisfactionSurveyInpatientRateV13,
  computeSatisfactionSurveyOutpatientRateV13,
  computeSatisfactionSurveyStaffRateV13,
  type SatisfactionSurveyMgmtRecordV13,
} from "../aggregators/satisfactionSurveyMgmtV13Aggregator.js";

const records: SatisfactionSurveyMgmtRecordV13[] = [
  { outpatientSatisfied: 950, outpatientTotal: 1000, inpatientSatisfied: 900, inpatientTotal: 1000, staffSatisfied: 980, staffTotal: 1000 },
  { outpatientSatisfied: 950, outpatientTotal: 1000, inpatientSatisfied: 900, inpatientTotal: 1000, staffSatisfied: 980, staffTotal: 1000 },
];

export const satisfactionSurveyMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/satisfaction-survey-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "satisfaction-survey-mgmt:read");
      if (denied) return denied;
      return json(ok({
        satisfactionSurveyOutpatientRate: computeSatisfactionSurveyOutpatientRateV13(records),
        satisfactionSurveyInpatientRate: computeSatisfactionSurveyInpatientRateV13(records),
        satisfactionSurveyStaffRate: computeSatisfactionSurveyStaffRateV13(records),
      }));
    },
  },
];
