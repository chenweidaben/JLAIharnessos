/**
 * 健澜科技 jlmedaios - 术中冰冻病理与术后石蜡符合率 V13 路由（M339-D）
 *
 * GET /api/v1/intraop-frozen-section
 *
 * 权限：intraop-frozen-section:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFrozenParaffinConcordanceV13,
  type FrozenSectionRecordV13,
} from "../aggregators/intraOpFrozenSectionV13Aggregator.js";

const records: FrozenSectionRecordV13[] = [
  { totalCases: 100, concordantCases: 95 },
];

export const intraOpFrozenSectionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/intraop-frozen-section",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "intraop-frozen-section:read");
      if (denied) return denied;
      return json(ok({
        concordanceRate: computeFrozenParaffinConcordanceV13(records),
      }));
    },
  },
];
