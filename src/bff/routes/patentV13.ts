/**
 * 健澜科技 jlmedaios - 专利授权 V13 路由（M343-D）
 *
 * GET /api/v1/patent
 *
 * 权限：patent:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDesignCountV13,
  computeInventionCountV13,
  computeUtilityModelCountV13,
  type PatentRecordV13,
} from "../aggregators/patentV13Aggregator.js";

const records: PatentRecordV13[] = [
  { inventionCount: 2, utilityModelCount: 5, designCount: 3 },
  { inventionCount: 3, utilityModelCount: 5, designCount: 7 },
];

export const patentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patent",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patent:read");
      if (denied) return denied;
      return json(ok({
        inventionCount: computeInventionCountV13(records),
        utilityModelCount: computeUtilityModelCountV13(records),
        designCount: computeDesignCountV13(records),
      }));
    },
  },
];
