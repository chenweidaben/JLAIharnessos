/**
 * 健澜科技 jlmedaios - 护理文书管理 V13 路由（M358-D，M358 收官）
 *
 * GET /api/v1/nursing-document
 *
 * 权限：nursing-document:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNursingDocumentPassRateV13,
  computeNursingRecordTimelyRateV13,
  computeOrderExecutionAccuracyRateV13,
  type NursingDocumentRecordV13,
} from "../aggregators/nursingDocumentV13Aggregator.js";

const records: NursingDocumentRecordV13[] = [
  { documentPassed: 95, documentSampled: 100, recordTimely: 480, recordCount: 500, orderAccurate: 990, orderExecuted: 1000 },
  { documentPassed: 95, documentSampled: 100, recordTimely: 470, recordCount: 500, orderAccurate: 995, orderExecuted: 1000 },
];

export const nursingDocumentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-document",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-document:read");
      if (denied) return denied;
      return json(ok({
        nursingDocumentPassRate: computeNursingDocumentPassRateV13(records),
        nursingRecordTimelyRate: computeNursingRecordTimelyRateV13(records),
        orderExecutionAccuracyRate: computeOrderExecutionAccuracyRateV13(records),
      }));
    },
  },
];
