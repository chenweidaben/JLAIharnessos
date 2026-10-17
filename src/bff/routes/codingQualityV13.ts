/**
 * 健澜科技 jlmedaios - 编码质量 V13 路由（M401-D，M401 收官）
 *
 * GET /api/v1/coding-quality
 *
 * 权限：coding-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCodingDefectRateV13,
  computeICD10AccuracyRateV13,
  computeICD9CM3AccuracyRateV13,
  type CodingQualityRecordV13,
} from "../aggregators/codingQualityV13Aggregator.js";

const records: CodingQualityRecordV13[] = [
  { icd10Accurate: 980, icd10Total: 1000, icd9Accurate: 970, icd9Total: 1000, defectCount: 20, totalCoding: 1000 },
  { icd10Accurate: 980, icd10Total: 1000, icd9Accurate: 970, icd9Total: 1000, defectCount: 20, totalCoding: 1000 },
];

export const codingQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/coding-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "coding-quality:read");
      if (denied) return denied;
      return json(ok({
        icd10AccuracyRate: computeICD10AccuracyRateV13(records),
        icd9CM3AccuracyRate: computeICD9CM3AccuracyRateV13(records),
        codingDefectRate: computeCodingDefectRateV13(records),
      }));
    },
  },
];
