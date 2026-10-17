/**
 * 健澜科技 jlmedaios - 经验精准主动推送 V13 路由（M302-A）
 *
 * GET /api/v1/contextual-push?dept=&disease=
 *
 * 权限：contextual-push:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  rankExperienceForContextV13,
  selectTopPushV13,
  suppressAlreadySeenV13,
  type PushExperienceV13,
} from "../aggregators/contextualPushV13Aggregator.js";

const candidates: PushExperienceV13[] = [
  { experienceId: "e-1", title: "房颤华法林", dept: "cardio", disease: "afib", freshnessScore: 90, evidenceStrength: 0.9 },
  { experienceId: "e-2", title: "术后低体温", dept: "surgery", disease: "postop", freshnessScore: 70, evidenceStrength: 0.5 },
  { experienceId: "e-3", title: "房颤阿司匹林", dept: "cardio", disease: "afib", freshnessScore: 60, evidenceStrength: 0.3 },
];

export const contextualPushV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/contextual-push",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "contextual-push:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      const disease = url.searchParams.get("disease") ?? "afib";
      const ranked = rankExperienceForContextV13(candidates, dept, disease);
      const unseen = suppressAlreadySeenV13(ranked, ["e-3"]);
      return json(ok(selectTopPushV13(unseen, 5)));
    },
  },
];
