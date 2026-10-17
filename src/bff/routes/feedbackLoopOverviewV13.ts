/**
 * 健澜科技 jlmedaios - 反馈闭环总览 V13 路由（M301-D）
 *
 * GET /api/v1/feedback-loop-overview
 *
 * 权限：feedback-loop-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildFeedbackLoopOverviewV13,
  computeLoopMaturityV13,
  identifyLoopGapV13,
} from "../aggregators/feedbackLoopOverviewV13Aggregator.js";

const overview = buildFeedbackLoopOverviewV13(
  50, 8, 2, 40, 45, 35,
);

export const feedbackLoopOverviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/feedback-loop-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "feedback-loop-overview:read");
      if (denied) return denied;
      return json(ok({
        ...overview,
        maturity: computeLoopMaturityV13(overview),
        gap: identifyLoopGapV13(overview),
      }));
    },
  },
];
