/**
 * 健澜科技 jlmedaios - 质控急诊专科规则 V14 路由（M510-A）
 *
 * GET  /api/v1/emr-qc-emergency-rules  （read，auth:true）返回急诊规则列表
 * POST /api/v1/emr-qc-emergency-rules  （auth:true）检查急诊病历
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildEmergencyReport,
  buildEmergencyRules,
  checkEmergency,
  type EmergencyRecordV14,
} from "../aggregators/emrQcEmergencyRulesV14Aggregator.js";

export const emrQcEmergencyRulesV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-emergency-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-emergency-rules:read");
      if (denied) return denied;
      const rules = buildEmergencyRules();
      return json(ok(rules));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-emergency-rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-emergency-rules:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: EmergencyRecordV14 = {
        hasTriage: Boolean(body?.hasTriage),
        hasRescueRecord: Boolean(body?.hasRescueRecord),
        hasTimeStamp: Boolean(body?.hasTimeStamp),
      };
      const result = checkEmergency(record);
      const report = buildEmergencyReport(result);
      return json(ok({ result, report }));
    },
  },
];
