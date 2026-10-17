/**
 * 健澜科技 jlmedaios - 单病种成本 V13 路由（M329-B）
 *
 * GET /api/v1/cost-per-patient
 *
 * 权限：cost-per-patient:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeConsumableRatioV13,
  computeDrugRatioV13,
  computeTop5DiseaseCostV13,
  type DiseaseCostV13,
} from "../aggregators/costPerPatientV13Aggregator.js";

const diseases: DiseaseCostV13[] = [
  { diseaseName: "急性心梗", totalCost: 15000, drugCost: 4500, consumableCost: 3000 },
  { diseaseName: "脑卒中", totalCost: 12000, drugCost: 3600, consumableCost: 2400 },
  { diseaseName: "肺炎", totalCost: 8000, drugCost: 2400, consumableCost: 1600 },
  { diseaseName: "阑尾炎", totalCost: 5000, drugCost: 1500, consumableCost: 1000 },
  { diseaseName: "骨折", totalCost: 10000, drugCost: 3000, consumableCost: 2000 },
  { diseaseName: "糖尿病", totalCost: 6000, drugCost: 1800, consumableCost: 1200 },
];

const referenceDisease: DiseaseCostV13 = {
  diseaseName: "阑尾炎",
  totalCost: 5000,
  drugCost: 1500,
  consumableCost: 1000,
};

export const costPerPatientV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cost-per-patient",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cost-per-patient:read");
      if (denied) return denied;
      return json(ok({
        top5: computeTop5DiseaseCostV13(diseases),
        drugRatio: computeDrugRatioV13(referenceDisease),
        consumableRatio: computeConsumableRatioV13(referenceDisease),
      }));
    },
  },
];
