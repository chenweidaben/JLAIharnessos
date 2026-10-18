/**
 * 健澜科技 jlmedaios - 质控营养科专科规则 V14 路由（M512-C）
 *
 * GET  /api/v1/emr-qc-nutrition-rules  （read，auth:true）返回营养科规则列表
 * POST /api/v1/emr-qc-nutrition-rules  （auth:true）检查营养科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNutritionReport,
  buildNutritionRules,
  checkNutrition,
  type NutritionRecordV14,
} from "../aggregators/emrQcNutritionRulesV14Aggregator.js";

export const emrQcNutritionRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-nutrition-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-nutrition-rules:read");
      if (denied) return denied;
      const rules = buildNutritionRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-nutrition-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-nutrition-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: NutritionRecordV14 = {
        hasNutritionAssessment: Boolean(body?.hasNutritionAssessment),
        hasDietOrder: Boolean(body?.hasDietOrder),
        hasFollowUp: Boolean(body?.hasFollowUp),
      };
      const result = checkNutrition(record);
      const report = buildNutritionReport(result);
      return json(ok({ result, report }));
    },
  },
];
