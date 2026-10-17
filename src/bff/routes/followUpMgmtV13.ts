/**
 * 健澜科技 jlmedaios - 随访管理 V13 路由（M400-C）
 *
 * GET /api/v1/follow-up-mgmt
 *
 * 权限：follow-up-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeChronicDiseaseFollowupRateV13,
  computeDischargeFollowupRateV13,
  computeHighRiskPatientFollowupRateV13,
  type FollowUpMgmtRecordV13,
} from "../aggregators/followUpMgmtV13Aggregator.js";

const records: FollowUpMgmtRecordV13[] = [
  { dischargeFollowed: 800, dischargeTotal: 1000, chronicFollowed: 750, chronicTotal: 1000, highRiskFollowed: 950, highRiskTotal: 1000 },
  { dischargeFollowed: 800, dischargeTotal: 1000, chronicFollowed: 750, chronicTotal: 1000, highRiskFollowed: 950, highRiskTotal: 1000 },
];

export const followUpMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/follow-up-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "follow-up-mgmt:read");
      if (denied) return denied;
      return json(ok({
        dischargeFollowupRate: computeDischargeFollowupRateV13(records),
        chronicDiseaseFollowupRate: computeChronicDiseaseFollowupRateV13(records),
        highRiskPatientFollowupRate: computeHighRiskPatientFollowupRateV13(records),
      }));
    },
  },
];
