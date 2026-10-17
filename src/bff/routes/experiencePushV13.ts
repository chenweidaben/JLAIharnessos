/**
 * 健澜科技 jlmedaios - 经验推送频控与免打扰 V13 路由（M295-B）
 *
 * GET /api/v1/experience-push?targetRole=nurse
 *
 * 权限：experience-push:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  throttlePushV13,
  type ExperiencePushV13,
} from "../aggregators/experiencePushV13Aggregator.js";

const candidates: ExperiencePushV13[] = [
  { experienceId: "e-1", title: "房颤华法林", category: "cardio", score: 82 },
  { experienceId: "e-2", title: "术后低体温", category: "postop", score: 46 },
  { experienceId: "e-3", title: "阿司匹林相互作用", category: "interaction", score: 86 },
  { experienceId: "e-4", title: "压疮护理", category: "nursing", score: 75 },
  { experienceId: "e-5", title: "抗生素剂量", category: "dose", score: 70 },
  { experienceId: "e-6", title: "VTE 预防", category: "prevention", score: 65 },
  { experienceId: "e-7", title: "血糖监测", category: "nursing", score: 60 },
];

export const experiencePushV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/experience-push",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-push:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const targetRole = url.searchParams.get("targetRole") ?? "nurse";
      const result = throttlePushV13(candidates, targetRole, 5);
      return json(ok(result));
    },
  },
];
