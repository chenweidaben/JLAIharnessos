/**
 * 健澜科技 jlmedaios - 数据质量管理 V13 路由（M409-B）
 *
 * GET /api/v1/data-quality-mgmt
 *
 * 权限：data-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDataAccuracyRateV13,
  computeDataCompletenessRateV13,
  computeDataTimelinessRateV13,
  type DataQualityMgmtRecordV13,
} from "../aggregators/dataQualityMgmtV13Aggregator.js";

const records: DataQualityMgmtRecordV13[] = [
  { complete: 980, should: 1000, accurate: 990, total: 1000, timely: 970, shouldReport: 1000 },
  { complete: 980, should: 1000, accurate: 990, total: 1000, timely: 970, shouldReport: 1000 },
];

export const dataQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        dataCompletenessRate: computeDataCompletenessRateV13(records),
        dataAccuracyRate: computeDataAccuracyRateV13(records),
        dataTimelinessRate: computeDataTimelinessRateV13(records),
      }));
    },
  },
];
