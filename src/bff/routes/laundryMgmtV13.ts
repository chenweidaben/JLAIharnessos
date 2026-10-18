/**
 * 健澜科技 jlmedaios - 被服洗涤管理 V13 路由（M437-B，后勤保障与环境管理深化组）
 *
 * GET /api/v1/laundry-mgmt
 *
 * 权限：laundry-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeLaundryCostControlRateV13,
  computeLaundryQualifiedRateV13,
  computeLaundryTurnoverTimelinessRateV13,
  type LaundryMgmtRecordV13,
} from "../aggregators/laundryMgmtV13Aggregator.js";

const records: LaundryMgmtRecordV13[] = [
  { qualifiedLaundry: 960, totalLaundry: 1000, timelyTurnover: 950, shouldTurnover: 1000, actualCost: 900, budgetCost: 1000 },
  { qualifiedLaundry: 960, totalLaundry: 1000, timelyTurnover: 950, shouldTurnover: 1000, actualCost: 900, budgetCost: 1000 },
];

export const laundryMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/laundry-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "laundry-mgmt:read");
      if (denied) return denied;
      return json(ok({
        laundryQualifiedRate: computeLaundryQualifiedRateV13(records),
        laundryTurnoverTimelinessRate: computeLaundryTurnoverTimelinessRateV13(records),
        laundryCostControlRate: computeLaundryCostControlRateV13(records),
      }));
    },
  },
];
