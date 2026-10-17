/**
 * 健澜科技 jlmedaios - 院长季度复盘报告 V13 路由（M310-D）
 *
 * GET /api/v1/quarterly-review?quarter=
 *
 * 权限：quarterly-review:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildQuarterlyReviewV13,
  generateNextQuarterSuggestionsV13,
  type QuarterlyKpiV13,
} from "../aggregators/quarterlyReviewV13Aggregator.js";

const kpis: QuarterlyKpiV13[] = [
  { name: "飞轮健康分", actual: 68, target: 80 },
  { name: "闭环率", actual: 65, target: 80 },
];

const highlights = ["心内科标杆", "双沉淀任务3个"];
const gaps = ["闭环率不足", "SOP沉淀不足"];

export const quarterlyReviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/quarterly-review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "quarterly-review:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const quarter = url.searchParams.get("quarter") ?? "2026-Q3";
      const review = buildQuarterlyReviewV13(quarter, kpis, highlights, gaps);
      return json(ok({
        review,
        nextQuarterActions: generateNextQuarterSuggestionsV13(review),
      }));
    },
  },
];
