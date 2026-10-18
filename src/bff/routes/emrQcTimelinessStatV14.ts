/**
 * 健澜科技 jlmedaios - 质控时效统计 V14 路由（M500-C）
 *
 * GET /api/v1/emr-qc-timeliness-stat  （read，auth:true）返回时效统计
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateTimelinessStat, buildTimelinessStat } from "../aggregators/emrQcTimelinessStatV14Aggregator.js";

const sampleStats = [
  buildTimelinessStat("内科", 24),
  buildTimelinessStat("外科", 48),
  buildTimelinessStat("儿科", 12),
];

export const emrQcTimelinessStatV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-timeliness-stat",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-timeliness-stat:read");
      if (denied) return denied;
      const aggregate = aggregateTimelinessStat(sampleStats);
      return json(ok({ stats: sampleStats, aggregate }));
    },
  },
];
