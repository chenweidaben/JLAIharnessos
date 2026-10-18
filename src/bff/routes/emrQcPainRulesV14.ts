/**
 * 健澜科技 jlmedaios - 质控疼痛科专科规则 V14 路由（M512-D，M512 收官）
 *
 * GET  /api/v1/emr-qc-pain-rules  （read，auth:true）返回疼痛科规则列表
 * POST /api/v1/emr-qc-pain-rules  （auth:true）检查疼痛科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPainReport,
  buildPainRules,
  checkPain,
  type PainRecordV14,
} from "../aggregators/emrQcPainRulesV14Aggregator.js";

export const emrQcPainRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-pain-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pain-rules:read");
      if (denied) return denied;
      const rules = buildPainRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-pain-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pain-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: PainRecordV14 = {
        hasPainScore: Boolean(body?.hasPainScore),
        hasTreatmentPlan: Boolean(body?.hasTreatmentPlan),
        hasFollowUp: Boolean(body?.hasFollowUp),
      };
      const result = checkPain(record);
      const report = buildPainReport(result);
      return json(ok({ result, report }));
    },
  },
];
