/**
 * 健澜科技 jlmedaios - 改进建议采纳率追踪 V13 路由（M309-A）
 *
 * GET /api/v1/suggestion-adoption?dept=
 *
 * 权限：suggestion-adoption:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  compareByDeptQuarterV13,
  computeSuggestionAdoptionRateV13,
  trackSuggestionAdoptionV13,
  type SuggestionItemV13,
} from "../aggregators/suggestionAdoptionV13Aggregator.js";

const suggestions: SuggestionItemV13[] = [
  { suggestionId: "s1", title: "开跨科讨论会", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s2", title: "优化推送时机", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s3", title: "加强医生培训", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s4", title: "完善反馈激励", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s5", title: "强化同行评审", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s6", title: "清理僵尸经验", dept: "cardio", quarter: "Q3", status: "adopted" },
  { suggestionId: "s7", title: "调整科室流程", dept: "cardio", quarter: "Q3", status: "rejected" },
  { suggestionId: "s8", title: "扩展AI推送", dept: "cardio", quarter: "Q3", status: "rejected" },
  { suggestionId: "s9", title: "建立SOP", dept: "cardio", quarter: "Q3", status: "implemented" },
  { suggestionId: "s10", title: "跨科会诊", dept: "cardio", quarter: "Q3", status: "implemented" },
  { suggestionId: "s11", title: "手术排程优化", dept: "surgery", quarter: "Q3", status: "adopted" },
  { suggestionId: "s12", title: "术后随访", dept: "surgery", quarter: "Q3", status: "rejected" },
];

export const suggestionAdoptionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/suggestion-adoption",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "suggestion-adoption:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept");
      const scoped = dept ? suggestions.filter((s) => s.dept === dept) : suggestions;
      return json(ok({
        stats: trackSuggestionAdoptionV13(scoped),
        adoptionRate: computeSuggestionAdoptionRateV13(scoped),
        byDeptQuarter: compareByDeptQuarterV13(scoped),
      }));
    },
  },
];
