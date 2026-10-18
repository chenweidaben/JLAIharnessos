/**
 * 健澜科技 jlmedaios - 质控病理科专科规则 V14 路由（M512-B）
 *
 * GET  /api/v1/emr-qc-pathology-rules  （read，auth:true）返回病理科规则列表
 * POST /api/v1/emr-qc-pathology-rules  （auth:true）检查病理科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPathologyReport,
  buildPathologyRules,
  checkPathology,
  type PathologyRecordV14,
} from "../aggregators/emrQcPathologyRulesV14Aggregator.js";

export const emrQcPathologyRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-pathology-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pathology-rules:read");
      if (denied) return denied;
      const rules = buildPathologyRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-pathology-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pathology-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: PathologyRecordV14 = {
        hasSpecimenLabel: Boolean(body?.hasSpecimenLabel),
        hasReport: Boolean(body?.hasReport),
        hasDiagnosis: Boolean(body?.hasDiagnosis),
      };
      const result = checkPathology(record);
      const report = buildPathologyReport(result);
      return json(ok({ result, report }));
    },
  },
];
