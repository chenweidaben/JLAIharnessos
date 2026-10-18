/**
 * 健澜科技 jlmedaios - 质控皮肤科专科规则 V14 路由（M511-A）
 *
 * GET  /api/v1/emr-qc-dermatology-rules  （read，auth:true）返回皮肤科规则列表
 * POST /api/v1/emr-qc-dermatology-rules  （auth:true）检查皮肤科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDermatologyReport,
  buildDermatologyRules,
  checkDermatology,
  type DermatologyRecordV14,
} from "../aggregators/emrQcDermatologyRulesV14Aggregator.js";

export const emrQcDermatologyRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-dermatology-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dermatology-rules:read");
      if (denied) return denied;
      const rules = buildDermatologyRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-dermatology-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-dermatology-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: DermatologyRecordV14 = {
        hasLesionDescription: Boolean(body?.hasLesionDescription),
        hasPhotoDocument: Boolean(body?.hasPhotoDocument),
        hasTreatmentPlan: Boolean(body?.hasTreatmentPlan),
      };
      const result = checkDermatology(record);
      const report = buildDermatologyReport(result);
      return json(ok({ result, report }));
    },
  },
];
