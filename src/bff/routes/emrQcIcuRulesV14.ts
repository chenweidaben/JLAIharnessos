/**
 * 健澜科技 jlmedaios - 质控重症医学科(ICU)专科规则 V14 路由（M510-B）
 *
 * GET  /api/v1/emr-qc-icu-rules  （read，auth:true）返回 ICU 规则列表
 * POST /api/v1/emr-qc-icu-rules  （auth:true）检查 ICU 病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildIcuReport,
  buildIcuRules,
  checkIcu,
  type IcuRecordV14,
} from "../aggregators/emrQcIcuRulesV14Aggregator.js";

export const emrQcIcuRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-icu-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-icu-rules:read");
      if (denied) return denied;
      const rules = buildIcuRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-icu-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-icu-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: IcuRecordV14 = {
        hasDailyNote: Boolean(body?.hasDailyNote),
        hasVitalSigns: Boolean(body?.hasVitalSigns),
        hasCarePlan: Boolean(body?.hasCarePlan),
      };
      const result = checkIcu(record);
      const report = buildIcuReport(result);
      return json(ok({ result, report }));
    },
  },
];
