/**
 * 健澜科技 jlmedaios - 质量管理体系 V13 路由（M395-C）
 *
 * GET /api/v1/quality-mgmt-system
 *
 * 权限：quality-mgmt-system:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeQualityCommitteeMeetingCountV13,
  computeQualityImprovementProjectCountV13,
  computeQualityObjectiveAchievementRateV13,
  type QualityMgmtSystemRecordV13,
} from "../aggregators/qualityMgmtSystemV13Aggregator.js";

const records: QualityMgmtSystemRecordV13[] = [
  { meetingCount: 12, achievedCount: 90, totalCount: 100, projectCount: 15 },
  { meetingCount: 12, achievedCount: 90, totalCount: 100, projectCount: 15 },
];

export const qualityMgmtSystemV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/quality-mgmt-system",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "quality-mgmt-system:read");
      if (denied) return denied;
      return json(ok({
        qualityCommitteeMeetingCount: computeQualityCommitteeMeetingCountV13(records),
        qualityObjectiveAchievementRate: computeQualityObjectiveAchievementRateV13(records),
        qualityImprovementProjectCount: computeQualityImprovementProjectCountV13(records),
      }));
    },
  },
];
