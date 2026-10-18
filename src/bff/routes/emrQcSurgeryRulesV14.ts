/**
 * 健澜科技 jlmedaios - 质控外科专科规则 V14 路由（M509-B）
 *
 * GET  /api/v1/emr-qc-surgery-rules  （read，auth:true）返回外科规则列表
 * POST /api/v1/emr-qc-surgery-rules  （auth:true）检查外科病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSurgeryReport,
  buildSurgeryRules,
  checkSurgery,
  type SurgeryRecordV14,
} from "../aggregators/emrQcSurgeryRulesV14Aggregator.js";

export const emrQcSurgeryRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-surgery-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-surgery-rules:read");
      if (denied) return denied;
      const rules = buildSurgeryRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-surgery-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-surgery-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: SurgeryRecordV14 = {
        hasOperativeNote: Boolean(body?.hasOperativeNote),
        hasAnesthesiaRecord: Boolean(body?.hasAnesthesiaRecord),
        hasPostOpRecord: Boolean(body?.hasPostOpRecord),
      };
      const result = checkSurgery(record);
      const report = buildSurgeryReport(result);
      return json(ok({ result, report }));
    },
  },
];
