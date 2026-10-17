/**
 * 健澜科技 jlmedaios - 个人学习曲线 V13 路由（M303-C）
 *
 * GET /api/v1/learning-curve?doctorId=
 *
 * 权限：learning-curve:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildLearningCurveV13,
  computeLearningSlopeV13,
  identifyLearningPlateauV13,
  type WeeklyAdoptionV13,
} from "../aggregators/learningCurveV13Aggregator.js";

const weekly: WeeklyAdoptionV13[] = [
  { weekLabel: "W1", adoptionRate: 20 },
  { weekLabel: "W2", adoptionRate: 28 },
  { weekLabel: "W3", adoptionRate: 35 },
  { weekLabel: "W4", adoptionRate: 42 },
];

export const learningCurveV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/learning-curve",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "learning-curve:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const doctorId = url.searchParams.get("doctorId") ?? "dr-001";
      void doctorId;
      const curve = buildLearningCurveV13(weekly);
      const slope = computeLearningSlopeV13(curve);
      return json(ok({
        curve,
        slope,
        plateauHint: identifyLearningPlateauV13(slope),
      }));
    },
  },
];
