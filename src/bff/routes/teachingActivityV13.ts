/**
 * 健澜科技 jlmedaios - 教学活动 V13 路由（M383-B）
 *
 * GET /api/v1/teaching-activity
 *
 * 权限：teaching-activity:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCaseDiscussionCountV13,
  computeMiniLectureCountV13,
  computeTeachingRoundCountV13,
  type TeachingActivityRecordV13,
} from "../aggregators/teachingActivityV13Aggregator.js";

const records: TeachingActivityRecordV13[] = [
  { teachingRoundCount: 50, miniLectureCount: 80, caseDiscussionCount: 60 },
  { teachingRoundCount: 50, miniLectureCount: 80, caseDiscussionCount: 60 },
];

export const teachingActivityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/teaching-activity",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "teaching-activity:read");
      if (denied) return denied;
      return json(ok({
        teachingRoundCount: computeTeachingRoundCountV13(records),
        miniLectureCount: computeMiniLectureCountV13(records),
        caseDiscussionCount: computeCaseDiscussionCountV13(records),
      }));
    },
  },
];
