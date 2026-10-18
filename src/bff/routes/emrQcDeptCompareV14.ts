/**
 * 健澜科技 jlmedaios - 质控科室对比 V14 路由（M493-B）
 *
 * GET /api/v1/emr-qc-dept-compare  （read，auth:true）返回对比数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDeptCompare, compareDeptMetrics } from "../aggregators/emrQcDeptCompareV14Aggregator.js";

export const emrQcDeptCompareV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dept-compare",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-compare:read");
      if (denied) return denied;
      const compare = buildDeptCompare("内科", "外科", 92, 85);
      const metricCompare = compareDeptMetrics("内科", 92, "外科", 85);
      return json(ok({ compare, metricCompare }));
    },
  },
];
