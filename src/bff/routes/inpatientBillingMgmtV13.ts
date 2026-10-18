/**
 * 健澜科技 jlmedaios - 住院收费管理 V13 路由（M448-B，财务与收费管理组）
 *
 * GET /api/v1/inpatient-billing-mgmt
 *
 * 权限：inpatient-billing-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInpatientBillingDepositSufficiencyRateV13,
  computeInpatientBillingDischargeSettlementTimelinessRateV13,
  computeInpatientBillingSettlementAccuracyRateV13,
  type InpatientBillingMgmtRecordV13,
} from "../aggregators/inpatientBillingMgmtV13Aggregator.js";

const records: InpatientBillingMgmtRecordV13[] = [
  { accurate: 950, totalSettle: 1000, sufficient: 900, totalPatient: 1000, timely: 980, totalDischarge: 1000 },
  { accurate: 950, totalSettle: 1000, sufficient: 900, totalPatient: 1000, timely: 980, totalDischarge: 1000 },
];

export const inpatientBillingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/inpatient-billing-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "inpatient-billing-mgmt:read");
      if (denied) return denied;
      return json(ok({
        inpatientBillingSettlementAccuracyRate: computeInpatientBillingSettlementAccuracyRateV13(records),
        inpatientBillingDepositSufficiencyRate: computeInpatientBillingDepositSufficiencyRateV13(records),
        inpatientBillingDischargeSettlementTimelinessRate: computeInpatientBillingDischargeSettlementTimelinessRateV13(records),
      }));
    },
  },
];
