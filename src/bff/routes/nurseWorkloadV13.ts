/**
 * 健澜科技 jlmedaios - 护士工作量 V13 路由（M330-B）
 *
 * GET /api/v1/nurse-workload
 *
 * 权限：nurse-workload:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgNursingDaysV13,
  countNursingOperationsV13,
  type NurseWorkloadV13,
} from "../aggregators/nurseWorkloadV13Aggregator.js";

const nurses: NurseWorkloadV13[] = [
  { nurseName: "张护士", nursingDays: 30, nursingOperations: 100 },
  { nurseName: "李护士", nursingDays: 40, nursingOperations: 150 },
  { nurseName: "王护士", nursingDays: 50, nursingOperations: 50 },
];

export const nurseWorkloadV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nurse-workload",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nurse-workload:read");
      if (denied) return denied;
      return json(ok({
        avgNursingDays: computeAvgNursingDaysV13(nurses),
        totalNursingOperations: countNursingOperationsV13(nurses),
      }));
    },
  },
];
