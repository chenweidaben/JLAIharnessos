/**
 * 健澜科技 jlmedaios - 质控合格率统计 V14 路由（M500-B）
 *
 * GET /api/v1/emr-qc-pass-rate-stat  （read，auth:true）返回合格率统计
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregatePassRateStat, buildPassRateStat } from "../aggregators/emrQcPassRateStatV14Aggregator.js";

const sampleStats = [
  buildPassRateStat("内科", 95, 100),
  buildPassRateStat("外科", 90, 100),
  buildPassRateStat("儿科", 88, 100),
];

export const emrQcPassRateStatV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-pass-rate-stat",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pass-rate-stat:read");
      if (denied) return denied;
      const aggregate = aggregatePassRateStat(sampleStats);
      return json(ok({ stats: sampleStats, aggregate }));
    },
  },
];
