/**
 * 健澜科技 jlmedaios - 抗菌药物使用强度 V13 路由（M333-C）
 *
 * GET /api/v1/antibiotic-use
 *
 * 权限：antibiotic-use:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAntibioticComplianceRateV13,
  computeAntibioticDDDsPerBedDayV13,
  type AntibioticUseRecordV13,
} from "../aggregators/antibioticUseV13Aggregator.js";

const records: AntibioticUseRecordV13[] = [
  { ddds: 400, inpatientDays: 2000, totalUseCount: 50, compliantUseCount: 40 },
];

export const antibioticUseV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/antibiotic-use",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "antibiotic-use:read");
      if (denied) return denied;
      return json(ok({
        dddsPerBedDay: computeAntibioticDDDsPerBedDayV13(records),
        complianceRate: computeAntibioticComplianceRateV13(records),
      }));
    },
  },
];
