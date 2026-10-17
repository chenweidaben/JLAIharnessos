/**
 * 健澜科技 jlmedaios - 人员流失率 V13 路由（M317-D）
 *
 * GET /api/v1/staff-turnover?month=
 *
 * 权限：staff-turnover:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMonthlyTurnoverRateV13,
  groupTurnoverByDeptV13,
  identifyHighTurnoverDeptsV13,
  type TurnoverRecordV13,
} from "../aggregators/staffTurnoverV13Aggregator.js";

const records: TurnoverRecordV13[] = [
  { dept: "cardio", headcountAtMonthStart: 20, resignationCount: 2 },
  { dept: "ortho", headcountAtMonthStart: 30, resignationCount: 1 },
  { dept: "icu", headcountAtMonthStart: 25, resignationCount: 1 },
  { dept: "ped", headcountAtMonthStart: 25, resignationCount: 1 },
];

export const staffTurnoverV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-turnover",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-turnover:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const month = url.searchParams.get("month") ?? "2026-09";
      const threshold = 8;
      const deptRates = groupTurnoverByDeptV13(records);
      return json(ok({
        month,
        threshold,
        monthlyRate: computeMonthlyTurnoverRateV13(records),
        deptRates,
        highTurnoverDepts: identifyHighTurnoverDeptsV13(deptRates, threshold),
      }));
    },
  },
];
