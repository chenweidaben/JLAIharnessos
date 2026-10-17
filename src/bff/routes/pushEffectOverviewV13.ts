/**
 * 健澜科技 jlmedaios - 推送效果与闭环总览 V13 路由（M302-D）
 *
 * GET /api/v1/push-effect-overview
 *
 * 权限：push-effect-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPushEffectOverviewV13,
  computePushROIV13,
  identifyPushGapV13,
  type PushLogV13,
} from "../aggregators/pushEffectOverviewV13Aggregator.js";

const pushLogs: PushLogV13[] = [
  { pushId: "p-1", clicked: true, adopted: true },
  { pushId: "p-2", clicked: true, adopted: true },
  { pushId: "p-3", clicked: true, adopted: false },
  { pushId: "p-4", clicked: false, adopted: false },
  { pushId: "p-5", clicked: false, adopted: false },
  { pushId: "p-6", clicked: false, adopted: false },
  { pushId: "p-7", clicked: false, adopted: false },
  { pushId: "p-8", clicked: false, adopted: false },
  { pushId: "p-9", clicked: false, adopted: false },
  { pushId: "p-10", clicked: false, adopted: false },
];

export const pushEffectOverviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/push-effect-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "push-effect-overview:read");
      if (denied) return denied;
      const overview = buildPushEffectOverviewV13(pushLogs);
      return json(ok({
        ...overview,
        roiPerK: computePushROIV13(overview.adoptions, 5, overview.impressions),
        gap: identifyPushGapV13(overview),
      }));
    },
  },
];
