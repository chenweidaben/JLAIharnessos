/**
 * 健澜科技 jlmedaios - 教学工作 V13 路由（M355-C）
 *
 * GET /api/v1/teaching-workload
 *
 * 权限：teaching-workload:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAnnualTeachingHoursV13,
  computeAnnualTeachingVisitsV13,
  computeInternCountV13,
  type TeachingWorkloadRecordV13,
} from "../aggregators/teachingWorkloadV13Aggregator.js";

const records: TeachingWorkloadRecordV13[] = [
  { annualTeachingVisits: 200, internCount: 50, annualTeachingHours: 800 },
  { annualTeachingVisits: 300, internCount: 70, annualTeachingHours: 1200 },
];

export const teachingWorkloadV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/teaching-workload",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "teaching-workload:read");
      if (denied) return denied;
      return json(ok({
        annualTeachingVisits: computeAnnualTeachingVisitsV13(records),
        internCount: computeInternCountV13(records),
        annualTeachingHours: computeAnnualTeachingHoursV13(records),
      }));
    },
  },
];
