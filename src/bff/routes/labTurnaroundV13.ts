/**
 * 健澜科技 jlmedaios - 检验报告周转时间 V13 路由（M338-A）
 *
 * GET /api/v1/lab-turnaround
 *
 * 权限：lab-turnaround:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyTATV13,
  computeInpatientTATV13,
  computeOutpatientTATV13,
  type LabTurnaroundRecordV13,
} from "../aggregators/labTurnaroundV13Aggregator.js";

const records: LabTurnaroundRecordV13[] = [
  { outpatientTATHours: 2, emergencyTATHours: 1, inpatientTATHours: 6 },
  { outpatientTATHours: 4, emergencyTATHours: 2, inpatientTATHours: 8 },
  { outpatientTATHours: 6, emergencyTATHours: 3, inpatientTATHours: 10 },
];

export const labTurnaroundV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/lab-turnaround",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "lab-turnaround:read");
      if (denied) return denied;
      return json(ok({
        outpatientTAT: computeOutpatientTATV13(records),
        emergencyTAT: computeEmergencyTATV13(records),
        inpatientTAT: computeInpatientTATV13(records),
      }));
    },
  },
];
