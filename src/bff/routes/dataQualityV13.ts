/**
 * 健澜科技 jlmedaios - 数据质量 V13 路由（M344-C）
 *
 * GET /api/v1/data-quality
 *
 * 权限：data-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAccuracyRateV13,
  computeCompletenessRateV13,
  computeConsistencyRateV13,
  computeTimelinessRateV13,
  type DataQualityRecordV13,
} from "../aggregators/dataQualityV13Aggregator.js";

const records: DataQualityRecordV13[] = [
  {
    completedFields: 95,
    requiredFields: 100,
    accurateCount: 98,
    sampledCount: 100,
    consistentCount: 97,
    consistentSampledCount: 100,
    timelyCount: 99,
    totalCount: 100,
  },
  {
    completedFields: 95,
    requiredFields: 100,
    accurateCount: 98,
    sampledCount: 100,
    consistentCount: 97,
    consistentSampledCount: 100,
    timelyCount: 99,
    totalCount: 100,
  },
];

export const dataQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-quality:read");
      if (denied) return denied;
      return json(ok({
        completenessRate: computeCompletenessRateV13(records),
        accuracyRate: computeAccuracyRateV13(records),
        consistencyRate: computeConsistencyRateV13(records),
        timelinessRate: computeTimelinessRateV13(records),
      }));
    },
  },
];
