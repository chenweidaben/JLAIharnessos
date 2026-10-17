/**
 * 健澜科技 jlmedaios - ICD 编码准确率 V13 路由（M334-B）
 *
 * GET /api/v1/icd-coding-accuracy
 *
 * 权限：icd-coding-accuracy:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePrimaryDxAccuracyV13,
  computeProcedureAccuracyV13,
  type ICDCodingRecordV13,
} from "../aggregators/icdCodingV13Aggregator.js";

const records: ICDCodingRecordV13[] = [
  { totalRecords: 100, primaryDxAccurateCount: 90, procedureAccurateCount: 85 },
];

export const icdCodingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/icd-coding-accuracy",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "icd-coding-accuracy:read");
      if (denied) return denied;
      return json(ok({
        primaryDxAccuracy: computePrimaryDxAccuracyV13(records),
        procedureAccuracy: computeProcedureAccuracyV13(records),
      }));
    },
  },
];
