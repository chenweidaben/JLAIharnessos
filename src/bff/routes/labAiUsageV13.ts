/**
 * 健澜科技 jlmedaios - 检验 AI 使用统计 V13 路由（M325-B）
 *
 * GET /api/v1/lab-ai-usage
 *
 * 权限：lab-ai-usage:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeLabAdoptionRateV13,
  countLabReviewCallsV13,
  type LabAiRecordV13,
} from "../aggregators/labAiUsageV13Aggregator.js";

const records: LabAiRecordV13[] = [
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: false },
  { isAdopted: false },
];

export const labAiUsageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/lab-ai-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "lab-ai-usage:read");
      if (denied) return denied;
      return json(ok({
        monthlyReviews: countLabReviewCallsV13(records),
        adoptionRate: computeLabAdoptionRateV13(records),
      }));
    },
  },
];
