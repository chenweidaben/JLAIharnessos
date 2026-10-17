/**
 * 健澜科技 jlmedaios - 科研管理 V13 路由（M361-A）
 *
 * GET /api/v1/research-mgmt
 *
 * 权限：research-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeResearchFundsReceivedV13,
  computeResearchOutcomeConversionRateV13,
  computeResearchProjectCountV13,
  type ResearchMgmtRecordV13,
} from "../aggregators/researchMgmtV13Aggregator.js";

const records: ResearchMgmtRecordV13[] = [
  { projectCount: 5, fundsReceived: 100.5, outcomeConverted: 3, outcomeTotal: 10 },
  { projectCount: 5, fundsReceived: 99.5, outcomeConverted: 2, outcomeTotal: 10 },
];

export const researchMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/research-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "research-mgmt:read");
      if (denied) return denied;
      return json(ok({
        projectCount: computeResearchProjectCountV13(records),
        fundsReceived: computeResearchFundsReceivedV13(records),
        outcomeConversionRate: computeResearchOutcomeConversionRateV13(records),
      }));
    },
  },
];
