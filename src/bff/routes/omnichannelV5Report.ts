/**
 * 健澜科技 jlmedaios - 多渠道服务整合 V5 路由（M270-C）
 *
 * GET /api/v1/omnichannel-v5/report
 *
 * 权限：omnichannel-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildOmnichannelV5Report } from "../aggregators/omnichannelV5ReportAggregator.js";

export const omnichannelV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/omnichannel-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "omnichannel-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildOmnichannelV5Report(timeRange);
      return json(ok(result));
    },
  },
];
