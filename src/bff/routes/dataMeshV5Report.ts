/**
 * 健澜科技 jlmedaios - 数据 Mesh 与数据产品化 V5 路由（M260-B）
 *
 * GET /api/v1/data-mesh-v5/report
 *
 * 权限：data-mesh-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDataMeshV5Report } from "../aggregators/dataMeshV5ReportAggregator.js";

export const dataMeshV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-mesh-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-mesh-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDataMeshV5Report(timeRange);
      return json(ok(result));
    },
  },
];
