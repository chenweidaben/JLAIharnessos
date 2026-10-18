/**
 * 健澜科技 jlmedaios - 行业作风建设质量管理 V13 路由（M438-D，M438 收官，行风廉洁与职业道德建设组）
 *
 * GET /api/v1/industry-style-quality-mgmt
 *
 * 权限：industry-style-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIndustryStyleComplaintDeclineRateV13,
  computeIndustryStyleNinePrinciplesAwarenessRateV13,
  computeIndustryStyleSatisfactionRateV13,
  type IndustryStyleQualityMgmtRecordV13,
} from "../aggregators/industryStyleQualityMgmtV13Aggregator.js";

const records: IndustryStyleQualityMgmtRecordV13[] = [
  { satisfiedPatients: 920, surveyedPatients: 1000, awareStaff: 950, totalStaff: 1000, lastComplaints: 1000, currentComplaints: 900 },
  { satisfiedPatients: 920, surveyedPatients: 1000, awareStaff: 950, totalStaff: 1000, lastComplaints: 1000, currentComplaints: 900 },
];

export const industryStyleQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/industry-style-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "industry-style-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        industryStyleSatisfactionRate: computeIndustryStyleSatisfactionRateV13(records),
        industryStyleNinePrinciplesAwarenessRate: computeIndustryStyleNinePrinciplesAwarenessRateV13(records),
        industryStyleComplaintDeclineRate: computeIndustryStyleComplaintDeclineRateV13(records),
      }));
    },
  },
];
