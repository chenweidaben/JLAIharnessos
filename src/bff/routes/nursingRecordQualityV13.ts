/**
 * 健澜科技 jlmedaios - 护理文书质量 V13 路由（M405-A）
 *
 * GET /api/v1/nursing-record-quality
 *
 * 权限：nursing-record-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNursingRecordPassRateV13,
  computeOrderExecutionSheetPassRateV13,
  computeTemperatureChartPassRateV13,
  type NursingRecordQualityRecordV13,
} from "../aggregators/nursingRecordQualityV13Aggregator.js";

const records: NursingRecordQualityRecordV13[] = [
  { recordPass: 980, recordTotal: 1000, tempPass: 990, tempTotal: 1000, orderPass: 970, orderTotal: 1000 },
  { recordPass: 980, recordTotal: 1000, tempPass: 990, tempTotal: 1000, orderPass: 970, orderTotal: 1000 },
];

export const nursingRecordQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-record-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-record-quality:read");
      if (denied) return denied;
      return json(ok({
        nursingRecordPassRate: computeNursingRecordPassRateV13(records),
        temperatureChartPassRate: computeTemperatureChartPassRateV13(records),
        orderExecutionSheetPassRate: computeOrderExecutionSheetPassRateV13(records),
      }));
    },
  },
];
