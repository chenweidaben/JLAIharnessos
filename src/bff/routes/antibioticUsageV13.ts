/**
 * 健澜科技 jlmedaios - 抗菌药物使用 V13 路由（M388-B）
 *
 * GET /api/v1/antibiotic-usage
 *
 * 权限：antibiotic-usage:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAntibioticDDDV13,
  computeInpatientAntibioticUsageRateV13,
  computeOutpatientAntibioticPrescriptionRateV13,
  type AntibioticUsageRecordV13,
} from "../aggregators/antibioticUsageV13Aggregator.js";

const records: AntibioticUsageRecordV13[] = [
  { inpatientUsageCount: 600, dischargeCount: 1000, antibioticRxCount: 200, totalRxCount: 1000, totalDdd: 4000, avgStayDays: 5 },
  { inpatientUsageCount: 600, dischargeCount: 1000, antibioticRxCount: 200, totalRxCount: 1000, totalDdd: 4000, avgStayDays: 5 },
];

export const antibioticUsageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/antibiotic-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "antibiotic-usage:read");
      if (denied) return denied;
      return json(ok({
        inpatientAntibioticUsageRate: computeInpatientAntibioticUsageRateV13(records),
        outpatientAntibioticPrescriptionRate: computeOutpatientAntibioticPrescriptionRateV13(records),
        antibioticDDD: computeAntibioticDDDV13(records),
      }));
    },
  },
];
