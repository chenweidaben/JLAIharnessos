/**
 * 健澜科技 jlmedaios - 质控内科专科规则 V14 路由（M509-A）
 *
 * GET  /api/v1/emr-qc-internal-med-rules  （read，auth:true）返回内科规则列表
 * POST /api/v1/emr-qc-internal-med-rules  （auth:true）检查内科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildInternalMedReport,
  buildInternalMedRules,
  checkInternalMed,
  type InternalMedRecordV14,
} from "../aggregators/emrQcInternalMedRulesV14Aggregator.js";

export const emrQcInternalMedRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-internal-med-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-internal-med-rules:read");
      if (denied) return denied;
      const rules = buildInternalMedRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-internal-med-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-internal-med-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: InternalMedRecordV14 = {
        hasChiefComplaint: Boolean(body?.hasChiefComplaint),
        hasDiagnosis: Boolean(body?.hasDiagnosis),
        hasMedication: Boolean(body?.hasMedication),
      };
      const result = checkInternalMed(record);
      const report = buildInternalMedReport(result);
      return json(ok({ result, report }));
    },
  },
];
