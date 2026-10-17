/**
 * 健澜科技 jlmedaios - 后勤管理 V13 路由（M362-C）
 *
 * GET /api/v1/logistics-mgmt
 *
 * 权限：logistics-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEquipmentIntactRateV13,
  computeMaterialSupplyTimelyRateV13,
  computePropertySatisfactionV13,
  type LogisticsMgmtRecordV13,
} from "../aggregators/logisticsMgmtV13Aggregator.js";

const records: LogisticsMgmtRecordV13[] = [
  { intactEquipment: 950, totalEquipment: 1000, timelySupply: 480, totalSupply: 500, propertySatisfaction: 95 },
  { intactEquipment: 950, totalEquipment: 1000, timelySupply: 470, totalSupply: 500, propertySatisfaction: 97 },
];

export const logisticsMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/logistics-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "logistics-mgmt:read");
      if (denied) return denied;
      return json(ok({
        equipmentIntactRate: computeEquipmentIntactRateV13(records),
        materialSupplyTimelyRate: computeMaterialSupplyTimelyRateV13(records),
        propertySatisfaction: computePropertySatisfactionV13(records),
      }));
    },
  },
];
