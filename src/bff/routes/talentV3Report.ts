/**
 * 健澜科技 jlmedaios - 人才队伍 V3 路由（M242-B）
 *
 * GET /api/v1/talent-v3/report
 *
 * 权限：talent-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildTalentV3Report } from "../aggregators/talentV3ReportAggregator.js";

export const talentV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/talent-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "talent-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildTalentV3Report(timeRange);
      return json(ok(result));
    },
  },
];
