/**
 * 健澜科技 jlmedaios - 质控缺陷统计 V14 路由（M500-A）
 *
 * GET /api/v1/emr-qc-defect-stat  （read，auth:true）返回缺陷统计
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { aggregateDefectStat, buildDefectStat } from "../aggregators/emrQcDefectStatV14Aggregator.js";

const sampleStats = [
  buildDefectStat("缺主诉", 15),
  buildDefectStat("超时限", 8),
  buildDefectStat("术语不规范", 5),
];

export const emrQcDefectStatV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-defect-stat",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-defect-stat:read");
      if (denied) return denied;
      const aggregate = aggregateDefectStat(sampleStats);
      return json(ok({ stats: sampleStats, aggregate }));
    },
  },
];
