/**
 * 健澜科技 jlmedaios - 药品短缺 V13 路由（M336-A）
 *
 * GET /api/v1/drug-shortage
 *
 * 权限：drug-shortage:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAffectedPatientsV13,
  computeAvgShortageDaysV13,
  computeShortageCountV13,
  type DrugShortageRecordV13,
} from "../aggregators/drugShortageV13Aggregator.js";

const records: DrugShortageRecordV13[] = [
  { shortageDays: 5, affectedPatients: 100 },
  { shortageDays: 3, affectedPatients: 50 },
  { shortageDays: 7, affectedPatients: 20 },
];

export const drugShortageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-shortage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-shortage:read");
      if (denied) return denied;
      return json(ok({
        count: computeShortageCountV13(records),
        avgShortageDays: computeAvgShortageDaysV13(records),
        affectedPatients: computeAffectedPatientsV13(records),
      }));
    },
  },
];
