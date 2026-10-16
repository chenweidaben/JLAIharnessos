/**
 * 健澜科技 jlmedaios - 集团患者转诊与资源调度 V5 路由（M273-D）
 *
 * GET /api/v1/group-referral-v5/report
 *
 * 权限：group-referral-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGroupReferralV5Report } from "../aggregators/groupReferralV5ReportAggregator.js";

export const groupReferralV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/group-referral-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "group-referral-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildGroupReferralV5Report(timeRange);
      return json(ok(result));
    },
  },
];
