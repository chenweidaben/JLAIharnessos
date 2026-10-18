/**
 * 健澜科技 jlmedaios - 质控口腔科专科规则 V14 路由（M511-C）
 *
 * GET  /api/v1/emr-qc-dentistry-rules  （read，auth:true）返回口腔科规则列表
 * POST /api/v1/emr-qc-dentistry-rules  （auth:true）检查口腔科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDentistryReport,
  buildDentistryRules,
  checkDentistry,
  type DentistryRecordV14,
} from "../aggregators/emrQcDentistryRulesV14Aggregator.js";

export const emrQcDentistryRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dentistry-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dentistry-rules:read");
      if (denied) return denied;
      const rules = buildDentistryRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-dentistry-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dentistry-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: DentistryRecordV14 = {
        hasToothChart: Boolean(body?.hasToothChart),
        hasXray: Boolean(body?.hasXray),
        hasTreatmentPlan: Boolean(body?.hasTreatmentPlan),
      };
      const result = checkDentistry(record);
      const report = buildDentistryReport(result);
      return json(ok({ result, report }));
    },
  },
];
