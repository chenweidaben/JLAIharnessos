/**
 * 健澜科技 jlmedaios - 多科室横向对标 V13 路由（M310-B）
 *
 * GET /api/v1/dept-benchmark
 *
 * 权限：dept-benchmark:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  identifyBenchmarkDeptV13,
  identifyLaggingDeptV13,
  rankDeptsByBenchmarkV13,
  type DeptBenchmarkV13,
} from "../aggregators/deptBenchmarkV13Aggregator.js";

const depts: DeptBenchmarkV13[] = [
  { deptId: "cardio", deptName: "心内科", closureRate: 80, sopCount: 3, adoptionRate: 70 },
  { deptId: "surgery", deptName: "外科", closureRate: 60, sopCount: 2, adoptionRate: 50 },
  { deptId: "pediatrics", deptName: "儿科", closureRate: 40, sopCount: 1, adoptionRate: 30 },
];

export const deptBenchmarkV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dept-benchmark",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dept-benchmark:read");
      if (denied) return denied;
      const ranked = rankDeptsByBenchmarkV13(depts);
      return json(ok({
        ranked,
        benchmark: identifyBenchmarkDeptV13(ranked),
        lagging: identifyLaggingDeptV13(ranked),
      }));
    },
  },
];
