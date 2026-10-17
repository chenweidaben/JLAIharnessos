/**
 * 健澜科技 jlmedaios - 运营成本管理 V13 路由（M407-A）
 *
 * GET /api/v1/operating-cost-mgmt
 *
 * 权限：operating-cost-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHundredYuanMedicalRevenueMaterialCostV13,
  computeManagementExpenseRatioV13,
  computePersonnelExpenditureRatioV13,
  type OperatingCostMgmtRecordV13,
} from "../aggregators/operatingCostMgmtV13Aggregator.js";

const records: OperatingCostMgmtRecordV13[] = [
  { materialCost: 200, medicalRevenue: 1000, personnelExp: 300, totalExp: 1000, mgmtExp: 100 },
  { materialCost: 200, medicalRevenue: 1000, personnelExp: 300, totalExp: 1000, mgmtExp: 100 },
];

export const operatingCostMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/operating-cost-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "operating-cost-mgmt:read");
      if (denied) return denied;
      return json(ok({
        hundredYuanMedicalRevenueMaterialCost: computeHundredYuanMedicalRevenueMaterialCostV13(records),
        personnelExpenditureRatio: computePersonnelExpenditureRatioV13(records),
        managementExpenseRatio: computeManagementExpenseRatioV13(records),
      }));
    },
  },
];
