/**
 * 健澜科技 jlmedaios - 经验复用效果度量 V13 路由（M295-D）
 *
 * GET /api/v1/reuse-roi ROI 看板
 *
 * 权限：reuse-roi:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildReuseROIV13,
  computeErrorReductionV13,
  measureReuseEffectV13,
  type AdoptionLogV13,
  type PushLogV13,
} from "../aggregators/reuseRoiV13Aggregator.js";

const pushLog: PushLogV13[] = [
  { pushId: "p-1", experienceId: "e-1" },
  { pushId: "p-2", experienceId: "e-2" },
  { pushId: "p-3", experienceId: "e-3" },
  { pushId: "p-4", experienceId: "e-4" },
];

const adoptionLog: AdoptionLogV13[] = [
  { pushId: "p-1", adopted: true },
  { pushId: "p-2", adopted: true },
  { pushId: "p-3", adopted: true },
  { pushId: "p-4", adopted: false },
];

export const reuseRoiV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/reuse-roi",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "reuse-roi:read");
      if (denied) return denied;
      const effect = measureReuseEffectV13(pushLog, adoptionLog);
      const errorReduction = computeErrorReductionV13(10, 3);
      return json(ok(buildReuseROIV13(effect, errorReduction)));
    },
  },
];
