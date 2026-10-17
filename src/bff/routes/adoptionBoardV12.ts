/**
 * 健澜科技 jlmedaios - 智能体采纳率反馈看板 V12 路由（M294-A）
 *
 * GET /api/v1/agent-adoption-board 采纳率看板
 *
 * 权限：agent-adoption:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAdoptionBoardV12,
  type FeedbackV12,
  type SuggestionV12,
} from "../aggregators/adoptionBoardV12Aggregator.js";

const suggestions: SuggestionV12[] = [
  { suggestionId: "sg-1", ruleId: "r-dose", status: "adopted" },
  { suggestionId: "sg-2", ruleId: "r-dose", status: "corrected" },
  { suggestionId: "sg-3", ruleId: "r-interaction", status: "adopted" },
  { suggestionId: "sg-4", ruleId: "r-interaction", status: "pending" },
];

const feedback: FeedbackV12[] = [
  { feedbackId: "fb-1", suggestionId: "sg-1", type: "adopt" },
  { feedbackId: "fb-2", suggestionId: "sg-2", type: "correct" },
  { feedbackId: "fb-3", suggestionId: "sg-3", type: "adopt" },
];

export const adoptionBoardV12Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/agent-adoption-board",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-adoption:read");
      if (denied) return denied;
      return json(ok(buildAdoptionBoardV12("all", suggestions, feedback)));
    },
  },
];
