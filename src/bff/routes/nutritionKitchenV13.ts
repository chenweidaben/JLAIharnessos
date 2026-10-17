/**
 * 健澜科技 jlmedaios - 营养食堂 V13 路由（M352-C）
 *
 * GET /api/v1/nutrition-kitchen
 *
 * 权限：nutrition-kitchen:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDiningSatisfactionV13,
  computeHygienePassRateV13,
  computeSampleRetentionRateV13,
  type NutritionKitchenRecordV13,
} from "../aggregators/nutritionKitchenV13Aggregator.js";

const records: NutritionKitchenRecordV13[] = [
  { hygienePassedCount: 98, hygieneSampledCount: 100, sampleRetainedCount: 100, sampleShouldCount: 100, diningSatisfaction: 4.2 },
  { hygienePassedCount: 97, hygieneSampledCount: 100, sampleRetainedCount: 100, sampleShouldCount: 100, diningSatisfaction: 4.3 },
];

export const nutritionKitchenV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nutrition-kitchen",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nutrition-kitchen:read");
      if (denied) return denied;
      return json(ok({
        hygienePassRate: computeHygienePassRateV13(records),
        sampleRetentionRate: computeSampleRetentionRateV13(records),
        diningSatisfaction: computeDiningSatisfactionV13(records),
      }));
    },
  },
];
