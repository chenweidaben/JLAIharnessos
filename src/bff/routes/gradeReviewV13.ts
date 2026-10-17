/**
 * 健澜科技 jlmedaios - 等级评审 V13 路由（M395-B）
 *
 * GET /api/v1/grade-review
 *
 * 权限：grade-review:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCoreClauseAchievementRateV13,
  computeGradeAReviewClauseConformanceRateV13,
  computeRectificationTaskCompletionRateV13,
  type GradeReviewRecordV13,
} from "../aggregators/gradeReviewV13Aggregator.js";

const records: GradeReviewRecordV13[] = [
  { conformingCount: 900, totalCount: 1000, achievedCount: 950, coreTotalCount: 1000, completedCount: 850, rectificationTotalCount: 1000 },
  { conformingCount: 900, totalCount: 1000, achievedCount: 950, coreTotalCount: 1000, completedCount: 850, rectificationTotalCount: 1000 },
];

export const gradeReviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/grade-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "grade-review:read");
      if (denied) return denied;
      return json(ok({
        gradeAReviewClauseConformanceRate: computeGradeAReviewClauseConformanceRateV13(records),
        coreClauseAchievementRate: computeCoreClauseAchievementRateV13(records),
        rectificationTaskCompletionRate: computeRectificationTaskCompletionRateV13(records),
      }));
    },
  },
];
