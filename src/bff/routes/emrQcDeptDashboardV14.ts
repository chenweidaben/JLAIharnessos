/**
 * 健澜科技 jlmedaios - 质控科室看板 V14 路由（M493-A）
 *
 * GET /api/v1/emr-qc-dept-dashboard  （read，auth:true）返回看板数据
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDeptDashboard, aggregateDeptMetrics, type DeptMetricV14 } from "../aggregators/emrQcDeptDashboardV14Aggregator.js";

const sampleMetrics: DeptMetricV14[] = [
  { name: "甲级病历率", value: 95 },
  { name: "病历合格率", value: 85 },
  { name: "缺陷整改率", value: 90 },
];

export const emrQcDeptDashboardV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dept-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dept-dashboard:read");
      if (denied) return denied;
      const dashboard = buildDeptDashboard("内科", sampleMetrics);
      const aggregate = aggregateDeptMetrics(sampleMetrics);
      return json(ok({ dashboard, aggregate }));
    },
  },
];
