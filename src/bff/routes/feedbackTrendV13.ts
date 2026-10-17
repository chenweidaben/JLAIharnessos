/**
 * 健澜科技 jlmedaios - 反馈信号看板与趋势 V13 路由（M301-C）
 *
 * GET /api/v1/feedback-trend?role=
 *
 * 权限：feedback-trend:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  aggregateWeeklyFeedbackV13,
  computeFeedbackTrendV13,
  identifyFeedbackRiskV13,
  type WeeklyFeedbackV13,
} from "../aggregators/feedbackTrendV13Aggregator.js";

const weekly: WeeklyFeedbackV13[] = [
  { weekLabel: "W1", adoptionRate: 30, modificationRate: 40, rejectionRate: 30 },
  { weekLabel: "W2", adoptionRate: 35, modificationRate: 40, rejectionRate: 25 },
  { weekLabel: "W3", adoptionRate: 45, modificationRate: 35, rejectionRate: 20 },
];

export const feedbackTrendV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/feedback-trend",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "feedback-trend:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      void url.searchParams.get("role");
      const agg = aggregateWeeklyFeedbackV13(weekly);
      const trend = computeFeedbackTrendV13(agg[agg.length - 1], agg[agg.length - 2]);
      return json(ok({ weekly: agg, trend, risk: identifyFeedbackRiskV13(agg) }));
    },
  },
];
