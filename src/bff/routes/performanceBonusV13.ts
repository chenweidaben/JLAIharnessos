/**
 * 健澜科技 jlmedaios - 绩效奖金 V13 路由（M410-C）
 *
 * GET /api/v1/performance-bonus
 *
 * 权限：performance-bonus:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBonusDistributionFairnessScoreV13,
  computePerCapitaPerformanceBonusV13,
  computePerformanceBonusRatioV13,
  type PerformanceBonusRecordV13,
} from "../aggregators/performanceBonusV13Aggregator.js";

const records: PerformanceBonusRecordV13[] = [
  { perCapitaBonus: 5000.5, bonusTotal: 300, salaryTotal: 1000, fairnessScore: 85.5 },
  { perCapitaBonus: 5000.5, bonusTotal: 300, salaryTotal: 1000, fairnessScore: 85.5 },
];

export const performanceBonusV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/performance-bonus",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "performance-bonus:read");
      if (denied) return denied;
      return json(ok({
        perCapitaPerformanceBonus: computePerCapitaPerformanceBonusV13(records),
        performanceBonusRatio: computePerformanceBonusRatioV13(records),
        bonusDistributionFairnessScore: computeBonusDistributionFairnessScoreV13(records),
      }));
    },
  },
];
