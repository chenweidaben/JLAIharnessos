/**
 * 健澜科技 jlmedaios - 元宇宙医院 V2 路由（M247-D）
 *
 * GET /api/v1/metaverse-hospital-v2/report
 *
 * 权限：metaverse-hospital-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildMetaverseHospitalV2Report } from "../aggregators/metaverseHospitalV2ReportAggregator.js";

export const metaverseHospitalV2ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/metaverse-hospital-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "metaverse-hospital-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildMetaverseHospitalV2Report(timeRange);
      return json(ok(result));
    },
  },
];
