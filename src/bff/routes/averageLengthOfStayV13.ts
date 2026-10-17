/**
 * 健澜科技 jlmedaios - 平均住院日 V13 路由（M334-D）
 *
 * GET /api/v1/average-length-of-stay
 *
 * 权限：average-length-of-stay:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeALOSVarianceV13,
  computeDeptALOSV13,
  computeOverallALOSV13,
  type ALOSRecordV13,
} from "../aggregators/averageLengthOfStayV13Aggregator.js";

const BENCHMARK_ALOS = 6.5;

const records: ALOSRecordV13[] = [
  { department: "心内科", inpatientDays: 5, caseCount: 1 },
  { department: "骨科", inpatientDays: 7, caseCount: 1 },
  { department: "神经内科", inpatientDays: 6, caseCount: 1 },
];

export const averageLengthOfStayV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/average-length-of-stay",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "average-length-of-stay:read");
      if (denied) return denied;
      const overall = computeOverallALOSV13(records);
      return json(ok({
        overallALOS: overall,
        departmentALOS: computeDeptALOSV13(records),
        varianceFromBenchmark: computeALOSVarianceV13(overall, BENCHMARK_ALOS),
      }));
    },
  },
];
