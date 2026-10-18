/**
 * 健澜科技 jlmedaios - 社工服务管理 V13 路由（M457-D，M457 收官，医院文化与公益管理组）
 *
 * GET /api/v1/social-work-service-mgmt
 *
 * 权限：social-work-service-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSocialWorkServiceCaseCountV13,
  computeSocialWorkServiceDifficultyPatientAssistRateV13,
  computeSocialWorkServiceGroupActivityCountV13,
  type SocialWorkServiceMgmtRecordV13,
} from "../aggregators/socialWorkServiceMgmtV13Aggregator.js";

const records: SocialWorkServiceMgmtRecordV13[] = [
  { caseCount: 950, groupActivityCount: 900, assisted: 980, totalDifficulty: 1000 },
  { caseCount: 950, groupActivityCount: 900, assisted: 980, totalDifficulty: 1000 },
];

export const socialWorkServiceMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/social-work-service-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "social-work-service-mgmt:read");
      if (denied) return denied;
      return json(ok({
        socialWorkServiceCaseCount: computeSocialWorkServiceCaseCountV13(records),
        socialWorkServiceGroupActivityCount: computeSocialWorkServiceGroupActivityCountV13(records),
        socialWorkServiceDifficultyPatientAssistRate: computeSocialWorkServiceDifficultyPatientAssistRateV13(records),
      }));
    },
  },
];
