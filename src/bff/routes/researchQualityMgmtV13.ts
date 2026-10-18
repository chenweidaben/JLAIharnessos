/**
 * 健澜科技 jlmedaios - 科研质量管理 V13 路由（M434-B，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
 *
 * GET /api/v1/research-quality-mgmt
 *
 * 权限：research-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeResearchFundingArrivalRateV13,
  computeResearchPaperCountV13,
  computeResearchProjectCountV13,
  type ResearchQualityMgmtRecordV13,
} from "../aggregators/researchQualityMgmtV13Aggregator.js";

const records: ResearchQualityMgmtRecordV13[] = [
  { projectCount: 5, paperCount: 8, arrivedFunding: 950, totalFunding: 1000 },
  { projectCount: 5, paperCount: 8, arrivedFunding: 950, totalFunding: 1000 },
];

export const researchQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/research-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "research-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        researchProjectCount: computeResearchProjectCountV13(records),
        researchPaperCount: computeResearchPaperCountV13(records),
        researchFundingArrivalRate: computeResearchFundingArrivalRateV13(records),
      }));
    },
  },
];
