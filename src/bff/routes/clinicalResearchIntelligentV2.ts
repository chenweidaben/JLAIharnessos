/**
 * 健澜科技 jlmedaios - 临床科研智能化 V2 路由（M233-B）
 *
 * GET /api/v1/clinical-research-ai-v2/report
 *
 * 权限：clinical-research-ai-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildClinicalResearchIntelligentV2 } from "../aggregators/clinicalResearchIntelligentV2Aggregator.js";

export const clinicalResearchIntelligentV2Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-research-ai-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-research-ai-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildClinicalResearchIntelligentV2(timeRange);
      return json(ok(result));
    },
  },
];
