/**
 * 健澜科技 jlmedaios - 影像 AI 使用统计 V13 路由（M325-A）
 *
 * GET /api/v1/imaging-ai-usage
 *
 * 权限：imaging-ai-usage:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyImagingByOrganV13,
  computeDetectionRateV13,
  countImagingAiCallsV13,
  type ImagingAiRecordV13,
} from "../aggregators/imagingAiUsageV13Aggregator.js";

const records: ImagingAiRecordV13[] = [
  { organ: "lung", isPositive: true },
  { organ: "lung", isPositive: false },
  { organ: "lung", isPositive: false },
  { organ: "lung", isPositive: false },
  { organ: "liver", isPositive: true },
  { organ: "liver", isPositive: false },
  { organ: "liver", isPositive: false },
  { organ: "heart", isPositive: false },
  { organ: "heart", isPositive: false },
  { organ: "brain", isPositive: false },
];

export const imagingAiUsageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/imaging-ai-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "imaging-ai-usage:read");
      if (denied) return denied;
      return json(ok({
        monthlyCalls: countImagingAiCallsV13(records),
        detectionRate: computeDetectionRateV13(records),
        organDistribution: classifyImagingByOrganV13(records),
      }));
    },
  },
];
