/**
 * 健澜科技 jlmedaios - 跨科室扩散总览 V13 路由（M304-D）
 *
 * GET /api/v1/diffusion-overview
 *
 * 权限：diffusion-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDiffusionOverviewV13,
  computeDiffusionMaturityV13,
  identifyDiffusionGapV13,
} from "../aggregators/diffusionOverviewV13Aggregator.js";

const input = {
  totalBroadcasts: 5,
  totalAdoptions: 3,
  totalActions: 4,
  totalDepts: 5,
  influencerDepts: 2,
  isolatedDepts: 1,
};

export const diffusionOverviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/diffusion-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "diffusion-overview:read");
      if (denied) return denied;
      const overview = buildDiffusionOverviewV13(input);
      return json(ok({
        ...overview,
        maturity: computeDiffusionMaturityV13(overview, input.totalDepts),
        gap: identifyDiffusionGapV13(overview),
      }));
    },
  },
];
