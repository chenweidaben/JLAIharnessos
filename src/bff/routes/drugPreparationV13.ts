/**
 * 健澜科技 jlmedaios - 制剂管理 V13 路由（M380-A）
 *
 * GET /api/v1/drug-preparation
 *
 * 权限：drug-preparation:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInhousePreparationVarietyCountV13,
  computeMonthlyPreparationOutputV13,
  computePreparationQualifiedRateV13,
  type DrugPreparationRecordV13,
} from "../aggregators/drugPreparationV13Aggregator.js";

const records: DrugPreparationRecordV13[] = [
  { preparationVarietyCount: 10, testBatchCount: 100, qualifiedBatchCount: 95, monthlyOutput: 5000 },
  { preparationVarietyCount: 10, testBatchCount: 100, qualifiedBatchCount: 95, monthlyOutput: 5000 },
];

export const drugPreparationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-preparation",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-preparation:read");
      if (denied) return denied;
      return json(ok({
        inhousePreparationVarietyCount: computeInhousePreparationVarietyCountV13(records),
        preparationQualifiedRate: computePreparationQualifiedRateV13(records),
        monthlyPreparationOutput: computeMonthlyPreparationOutputV13(records),
      }));
    },
  },
];
