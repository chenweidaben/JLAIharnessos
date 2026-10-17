/**
 * 健澜科技 jlmedaios - 病理报告 TAT V13 路由（M342-B）
 *
 * GET /api/v1/pathology-turnaround
 *
 * 权限：pathology-turnaround:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFrozenTATV13,
  computeIntraOpTATV13,
  computeRoutineTATV13,
  type PathologyTurnaroundRecordV13,
} from "../aggregators/pathologyTurnaroundV13Aggregator.js";

const records: PathologyTurnaroundRecordV13[] = [
  { routineTatHours: 24, intraOpTatHours: 1, frozenTatHours: 0.5 },
  { routineTatHours: 48, intraOpTatHours: 2, frozenTatHours: 1 },
  { routineTatHours: 72, intraOpTatHours: 3, frozenTatHours: 1.5 },
];

export const pathologyTurnaroundV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pathology-turnaround",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pathology-turnaround:read");
      if (denied) return denied;
      return json(ok({
        routineTat: computeRoutineTATV13(records),
        intraOpTat: computeIntraOpTATV13(records),
        frozenTat: computeFrozenTATV13(records),
      }));
    },
  },
];
