/**
 * 健澜科技 jlmedaios - 血库库存 V13 路由（M328-D）
 *
 * GET /api/v1/blood-inventory
 *
 * 权限：blood-inventory:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  countBloodByTypeV13,
  countNearExpiryBloodV13,
  type BloodUnitV13,
} from "../aggregators/bloodInventoryV13Aggregator.js";

const bloods: BloodUnitV13[] = [
  { bloodType: "A", daysToExpiry: 30 },
  { bloodType: "A", daysToExpiry: 20 },
  { bloodType: "A", daysToExpiry: 10 },
  { bloodType: "A", daysToExpiry: 5 },
  { bloodType: "A", daysToExpiry: 60 },
  { bloodType: "B", daysToExpiry: 40 },
  { bloodType: "B", daysToExpiry: 30 },
  { bloodType: "B", daysToExpiry: 3 },
  { bloodType: "O", daysToExpiry: 50 },
  { bloodType: "O", daysToExpiry: 20 },
  { bloodType: "O", daysToExpiry: 15 },
  { bloodType: "O", daysToExpiry: 10 },
  { bloodType: "O", daysToExpiry: 90 },
  { bloodType: "O", daysToExpiry: 70 },
  { bloodType: "O", daysToExpiry: 80 },
  { bloodType: "O", daysToExpiry: 60 },
  { bloodType: "AB", daysToExpiry: 25 },
  { bloodType: "AB", daysToExpiry: 35 },
];

export const bloodInventoryV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/blood-inventory",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "blood-inventory:read");
      if (denied) return denied;
      return json(ok({
        stockByType: countBloodByTypeV13(bloods),
        nearExpiry: countNearExpiryBloodV13(bloods),
      }));
    },
  },
];
