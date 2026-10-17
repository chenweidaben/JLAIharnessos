/**
 * 健澜科技 jlmedaios - 护士满意度调研 V13 路由（M332-C）
 *
 * GET /api/v1/nurse-satisfaction
 *
 * 权限：nurse-satisfaction:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNurseSatisfactionV13,
  type NurseSatisfactionSurveyV13,
} from "../aggregators/nurseSatisfactionV13Aggregator.js";

const surveys: NurseSatisfactionSurveyV13[] = [
  { salary: 3, scheduling: 4, workEnvironment: 3 },
  { salary: 4, scheduling: 3, workEnvironment: 4 },
  { salary: 5, scheduling: 4, workEnvironment: 4 },
];

export const nurseSatisfactionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nurse-satisfaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nurse-satisfaction:read");
      if (denied) return denied;
      return json(ok({
        dimensions: computeNurseSatisfactionV13(surveys),
      }));
    },
  },
];
