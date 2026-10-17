/**
 * 健澜科技 jlmedaios - 公共关系 V13 路由（M398-D，M398 收官）
 *
 * GET /api/v1/public-relation
 *
 * 权限：public-relation:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCommunityHealthEducationCountV13,
  computeMediaPositiveReportCountV13,
  computeVolunteerServiceHoursV13,
  type PublicRelationRecordV13,
} from "../aggregators/publicRelationV13Aggregator.js";

const records: PublicRelationRecordV13[] = [
  { positiveReportCount: 10, volunteerHours: 100, healthEducationCount: 5 },
  { positiveReportCount: 10, volunteerHours: 100, healthEducationCount: 5 },
];

export const publicRelationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/public-relation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "public-relation:read");
      if (denied) return denied;
      return json(ok({
        mediaPositiveReportCount: computeMediaPositiveReportCountV13(records),
        volunteerServiceHours: computeVolunteerServiceHoursV13(records),
        communityHealthEducationCount: computeCommunityHealthEducationCountV13(records),
      }));
    },
  },
];
