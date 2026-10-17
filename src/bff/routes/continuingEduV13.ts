/**
 * 健澜科技 jlmedaios - 继续医学教育 V13 路由（M343-B）
 *
 * GET /api/v1/continuing-edu
 *
 * 权限：continuing-edu:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgCreditV13,
  computeCategory1CountV13,
  computeCategory2CountV13,
  type ContinuingEduRecordV13,
} from "../aggregators/continuingEduV13Aggregator.js";

const records: ContinuingEduRecordV13[] = [
  { category1Count: 5, category2Count: 10, avgCredit: 20 },
  { category1Count: 3, category2Count: 7, avgCredit: 30 },
  { category1Count: 0, category2Count: 0, avgCredit: 40 },
];

export const continuingEduV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/continuing-edu",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "continuing-edu:read");
      if (denied) return denied;
      return json(ok({
        category1Count: computeCategory1CountV13(records),
        category2Count: computeCategory2CountV13(records),
        avgCredit: computeAvgCreditV13(records),
      }));
    },
  },
];
