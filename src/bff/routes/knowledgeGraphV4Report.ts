/**
 * 健澜科技 jlmedaios - 知识图谱 V4 路由（M248-D）
 *
 * GET /api/v1/knowledge-graph-v4/report
 *
 * 权限：knowledge-graph-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildKnowledgeGraphV4Report } from "../aggregators/knowledgeGraphV4ReportAggregator.js";

export const knowledgeGraphV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/knowledge-graph-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge-graph-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildKnowledgeGraphV4Report(timeRange);
      return json(ok(result));
    },
  },
];
