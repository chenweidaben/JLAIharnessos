/**
 * 健澜科技 jlmedaios - 学术水平 V13 路由（M403-D，M403 收官）
 *
 * GET /api/v1/academic-level
 *
 * 权限：academic-level:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNationalAcademicSocietyPositionCountV13,
  computeNationalResearchProjectCountV13,
  computeSCIPaperCountV13,
  type AcademicLevelRecordV13,
} from "../aggregators/academicLevelV13Aggregator.js";

const records: AcademicLevelRecordV13[] = [
  { nationalPosition: 5, sciPaper: 10, nationalProject: 3 },
  { nationalPosition: 5, sciPaper: 10, nationalProject: 3 },
];

export const academicLevelV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/academic-level",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "academic-level:read");
      if (denied) return denied;
      return json(ok({
        nationalAcademicSocietyPositionCount: computeNationalAcademicSocietyPositionCountV13(records),
        sciPaperCount: computeSCIPaperCountV13(records),
        nationalResearchProjectCount: computeNationalResearchProjectCountV13(records),
      }));
    },
  },
];
