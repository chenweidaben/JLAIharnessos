/**
 * 健澜科技 jlmedaios - 质控康复科专科规则 V14 路由（M510-D，M510 收官）
 *
 * GET  /api/v1/emr-qc-rehab-rules  （read，auth:true）返回康复科规则列表
 * POST /api/v1/emr-qc-rehab-rules  （auth:true）检查康复科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRehabReport,
  buildRehabRules,
  checkRehab,
  type RehabRecordV14,
} from "../aggregators/emrQcRehabRulesV14Aggregator.js";

export const emrQcRehabRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-rehab-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rehab-rules:read");
      if (denied) return denied;
      const rules = buildRehabRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-rehab-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rehab-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: RehabRecordV14 = {
        hasAssessment: Boolean(body?.hasAssessment),
        hasTreatmentPlan: Boolean(body?.hasTreatmentPlan),
        hasProgressNote: Boolean(body?.hasProgressNote),
      };
      const result = checkRehab(record);
      const report = buildRehabReport(result);
      return json(ok({ result, report }));
    },
  },
];
