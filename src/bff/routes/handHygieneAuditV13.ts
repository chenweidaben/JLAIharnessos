/**
 * 健澜科技 jlmedaios - 手卫生督查 V13 路由（M423-A，换名避让旧版 handHygieneComplianceV13（M418））
 *
 * GET /api/v1/hand-hygiene-audit
 *
 * 权限：hand-hygiene-audit:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHandHygieneAuditCoverageRateV13,
  computeHandHygieneSuppliesConsumptionRateV13,
  computeHandHygieneTrainingCoverageRateV13,
  type HandHygieneAuditRecordV13,
} from "../aggregators/handHygieneAuditV13Aggregator.js";

const records: HandHygieneAuditRecordV13[] = [
  { auditedDept: 95, shouldAuditDept: 100, suppliesCompliantDept: 90, deptTotal: 100, trainedPersons: 950, shouldTrainPersons: 1000 },
  { auditedDept: 95, shouldAuditDept: 100, suppliesCompliantDept: 90, deptTotal: 100, trainedPersons: 950, shouldTrainPersons: 1000 },
];

export const handHygieneAuditV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hand-hygiene-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hand-hygiene-audit:read");
      if (denied) return denied;
      return json(ok({
        handHygieneAuditCoverageRate: computeHandHygieneAuditCoverageRateV13(records),
        handHygieneSuppliesConsumptionRate: computeHandHygieneSuppliesConsumptionRateV13(records),
        handHygieneTrainingCoverageRate: computeHandHygieneTrainingCoverageRateV13(records),
      }));
    },
  },
];
