/**
 * 健澜科技 jlmedaios - 药耗占比 V13 路由（M356-C）
 *
 * GET /api/v1/drug-consumable-ratio
 *
 * 权限：drug-consumable-ratio:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeConsumableRatioV13,
  computeDrugRatioV13,
  computeLabExamRatioV13,
  type DrugConsumableRatioRecordV13,
} from "../aggregators/drugConsumableRatioV13Aggregator.js";

const records: DrugConsumableRatioRecordV13[] = [
  { drugRevenue: 300, consumableRevenue: 150, labExamRevenue: 120, medicalRevenue: 1000 },
  { drugRevenue: 200, consumableRevenue: 150, labExamRevenue: 80, medicalRevenue: 1000 },
];

export const drugConsumableRatioV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-consumable-ratio",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-consumable-ratio:read");
      if (denied) return denied;
      return json(ok({
        drugRatio: computeDrugRatioV13(records),
        consumableRatio: computeConsumableRatioV13(records),
        labExamRatio: computeLabExamRatioV13(records),
      }));
    },
  },
];
