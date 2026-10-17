/**
 * 健澜科技 jlmedaios - 药品不良反应 V13 路由（M368-A）
 *
 * GET /api/v1/drug-adverse-reaction
 *
 * 权限：drug-adverse-reaction:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdrReportCountV13,
  computeAdrReportTimelyRateV13,
  computeSeriousAdrCountV13,
  type DrugAdverseReactionRecordV13,
} from "../aggregators/drugAdverseReactionV13Aggregator.js";

const records: DrugAdverseReactionRecordV13[] = [
  { adrReportCount: 100, seriousAdrCount: 10, timelyReportCount: 95 },
  { adrReportCount: 100, seriousAdrCount: 10, timelyReportCount: 95 },
];

export const drugAdverseReactionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-adverse-reaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-adverse-reaction:read");
      if (denied) return denied;
      return json(ok({
        adrReportCount: computeAdrReportCountV13(records),
        seriousAdrCount: computeSeriousAdrCountV13(records),
        adrReportTimelyRate: computeAdrReportTimelyRateV13(records),
      }));
    },
  },
];
