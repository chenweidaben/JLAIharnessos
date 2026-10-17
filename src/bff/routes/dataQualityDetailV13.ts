/**
 * 健澜科技 jlmedaios - 数据质量明细 V13 路由（M379-D，detail 避让，M379 收官）
 *
 * GET /api/v1/data-quality-detail
 *
 * 权限：data-quality-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDataAccuracyRateV13,
  computeDataCompletenessRateV13,
  computeDataConsistencyRateV13,
  type DataQualityRecordV13,
} from "../aggregators/dataQualityDetailV13Aggregator.js";

const records: DataQualityRecordV13[] = [
  { totalFields: 1000, completeFields: 950, totalRecords: 1000, accurateRecords: 980, consistentRecords: 970 },
  { totalFields: 1000, completeFields: 950, totalRecords: 1000, accurateRecords: 980, consistentRecords: 970 },
];

export const dataQualityDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-quality-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-quality-detail:read");
      if (denied) return denied;
      return json(ok({
        dataCompletenessRate: computeDataCompletenessRateV13(records),
        dataAccuracyRate: computeDataAccuracyRateV13(records),
        dataConsistencyRate: computeDataConsistencyRateV13(records),
      }));
    },
  },
];
