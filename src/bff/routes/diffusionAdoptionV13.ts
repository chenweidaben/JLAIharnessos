/**
 * 健澜科技 jlmedaios - 跨科室采纳反馈 V13 路由（M304-B）
 *
 * GET /api/v1/diffusion-adoption?experienceId=
 *
 * 权限：diffusion-adoption:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDiffusionAdoptionRateV13,
  flagDiffusionFailureV13,
  trackDiffusionAdoptionV13,
  type DiffusionActionV13,
} from "../aggregators/diffusionAdoptionV13Aggregator.js";

const actions: DiffusionActionV13[] = [
  { experienceId: "e-1", deptId: "surgery", action: "adopted" },
  { experienceId: "e-1", deptId: "emergency", action: "adopted" },
  { experienceId: "e-1", deptId: "neurology", action: "adopted" },
  { experienceId: "e-1", deptId: "pediatrics", action: "rejected" },
];

export const diffusionAdoptionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/diffusion-adoption",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "diffusion-adoption:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      void url.searchParams.get("experienceId");
      const tracked = actions.map(trackDiffusionAdoptionV13);
      const rate = computeDiffusionAdoptionRateV13(actions);
      return json(ok({
        tracked,
        adoptionRate: rate,
        failureHint: flagDiffusionFailureV13(rate),
      }));
    },
  },
];
