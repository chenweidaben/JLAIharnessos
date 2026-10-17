/**
 * 健澜科技 jlmedaios - MUSE 投入产出报告 V13 路由（M321-D）
 *
 * GET /api/v1/muse-roi-report
 *
 * 权限：muse-roi-report:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRoiSummaryV13,
  computeWorkHourSavedV13,
  nextMonthProjectionV13,
  type RoiHistoryV13,
  type RoiSummaryV13,
} from "../aggregators/museRoiReportV13Aggregator.js";

const summary: RoiSummaryV13 = {
  totalCalls: 10000,
  adverseEventsReduced: 50,
  adoptedSuggestions: 800,
};

const history: RoiHistoryV13[] = [
  { month: "2026-08", calls: 800 },
  { month: "2026-09", calls: 900 },
  { month: "2026-10", calls: 1000 },
];

const MINUTES_PER_CALL = 5;

export const museRoiReportV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-roi-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-roi-report:read");
      if (denied) return denied;
      return json(ok({
        roiSummary: computeRoiSummaryV13(summary, MINUTES_PER_CALL),
        workHoursSaved: computeWorkHourSavedV13(summary.totalCalls, MINUTES_PER_CALL),
        nextMonthProjection: nextMonthProjectionV13(history),
      }));
    },
  },
];
