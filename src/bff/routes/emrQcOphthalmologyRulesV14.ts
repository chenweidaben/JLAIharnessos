/**
 * 健澜科技 jlmedaios - 质控眼科专科规则 V14 路由（M511-B）
 *
 * GET  /api/v1/emr-qc-ophthalmology-rules  （read，auth:true）返回眼科规则列表
 * POST /api/v1/emr-qc-ophthalmology-rules  （auth:true）检查眼科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildOphthalmologyReport,
  buildOphthalmologyRules,
  checkOphthalmology,
  type OphthalmologyRecordV14,
} from "../aggregators/emrQcOphthalmologyRulesV14Aggregator.js";

export const emrQcOphthalmologyRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-ophthalmology-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ophthalmology-rules:read");
      if (denied) return denied;
      const rules = buildOphthalmologyRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-ophthalmology-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-ophthalmology-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: OphthalmologyRecordV14 = {
        hasVisualAcuity: Boolean(body?.hasVisualAcuity),
        hasFundusExam: Boolean(body?.hasFundusExam),
        hasRefractionNote: Boolean(body?.hasRefractionNote),
      };
      const result = checkOphthalmology(record);
      const report = buildOphthalmologyReport(result);
      return json(ok({ result, report }));
    },
  },
];
