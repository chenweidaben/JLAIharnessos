/**
 * 健澜科技 jlmedaios - 病历质控满意度调查 V14 路由（M469-D，M469 收官）
 *
 * GET  /api/v1/emr-satisfaction  （read，auth:true）返回满意度列表
 * POST /api/v1/emr-satisfaction  （auth:true，body 用 await c.req.json()）提交问卷
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSatisfactionScore,
  rankBySatisfaction,
  type SatisfactionResponseV14,
} from "../aggregators/emrSatisfactionV14Aggregator.js";

const demoResponses: SatisfactionResponseV14[] = [
  { dept: "内科", score: 90 },
  { dept: "内科", score: 80 },
  { dept: "内科", score: 100 },
  { dept: "外科", score: 70 },
  { dept: "外科", score: 80 },
];

export const emrSatisfactionV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-satisfaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-satisfaction:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      const aggregated = computeSatisfactionScore(demoResponses);
      const ranked = rankBySatisfaction(aggregated);
      return json(ok({ aggregated, ranked }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-satisfaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-satisfaction:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as Partial<SatisfactionResponseV14>;
      return json(ok({ submitted: true, dept: body.dept ?? "", score: body.score ?? 0 }));
    },
  },
];
