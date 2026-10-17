/**
 * 健澜科技 jlmedaios - MUSE 采纳率与使用度量 V5 路由（M285-A）
 *
 * GET  /api/v1/muse-value（采纳率看板）
 * GET  /api/v1/muse-value/time-saved（节省时间）
 * GET  /api/v1/muse-value/ranking（技能排行）
 *
 * 权限：muse-value:read / muse-value:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMuseValueV5Report,
  estimateTimeSavedV5,
  rankSkillsV5,
  type UsageMetric,
} from "../aggregators/museValueV5Aggregator.js";

const metricStore: UsageMetric[] = [
  { role: "医生", skill: "病案首页生成", sessionCount: 1200, adopted: 980, rejected: 120, timeSavedMin: 3600 },
  { role: "护士", skill: "巡视记录", sessionCount: 800, adopted: 600, rejected: 200, timeSavedMin: 1800 },
  { role: "药师", skill: "审方建议", sessionCount: 500, adopted: 380, rejected: 80, timeSavedMin: 900 },
];

export const museValueV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-value",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-value:read");
      if (denied) return denied;

      return json(ok(buildMuseValueV5Report(metricStore)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-value/time-saved",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-value:read");
      if (denied) return denied;

      const actions = Number(c.query.get("actions") ?? "100");
      const avg = Number(c.query.get("avgMinutes") ?? "5");
      return json(ok({ hours: estimateTimeSavedV5(actions, avg) }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-value/ranking",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-value:read");
      if (denied) return denied;

      return json(ok(rankSkillsV5(metricStore)));
    },
  },
];
