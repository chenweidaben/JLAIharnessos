/**
 * 健澜科技 jlmedaios - 采购质量管理 V13 路由（M435-B，-quality 后缀避让旧版采购模块（M408 consumableSupplyMgmtV13 等））
 *
 * GET /api/v1/procurement-quality-mgmt
 *
 * 权限：procurement-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeProcurementComplianceRateV13,
  computeProcurementSavingRateV13,
  computeProcurementTimelinessRateV13,
  type ProcurementQualityMgmtRecordV13,
} from "../aggregators/procurementQualityMgmtV13Aggregator.js";

const records: ProcurementQualityMgmtRecordV13[] = [
  { timelyProcurement: 950, shouldProcurement: 1000, compliantProcurement: 980, totalProcurement: 1000, savingAmount: 100, budgetAmount: 1000 },
  { timelyProcurement: 950, shouldProcurement: 1000, compliantProcurement: 980, totalProcurement: 1000, savingAmount: 100, budgetAmount: 1000 },
];

export const procurementQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/procurement-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "procurement-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        procurementTimelinessRate: computeProcurementTimelinessRateV13(records),
        procurementComplianceRate: computeProcurementComplianceRateV13(records),
        procurementSavingRate: computeProcurementSavingRateV13(records),
      }));
    },
  },
];
